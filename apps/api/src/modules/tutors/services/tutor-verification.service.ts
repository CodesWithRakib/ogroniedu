import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { TutorProfileEntity } from '../entities/tutor-profile.entity';
import { TutorQualificationEntity } from '../entities/tutor-qualification.entity';
import { TutorVerificationReviewEntity } from '../entities/tutor-verification-review.entity';
import { UserEntity } from '../../auth/entities/user.entity';
import { AuditService } from '../../audit/audit.service';
import { NotificationService } from '../../notifications/notification.service';
import { AdminReviewTutorDto } from '../dto';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { TUTOR_VERIFICATION_POLICY_VERSION } from '../constants/tutor.constants';

/**
 * Compliance verification workflow: pending queue, review dossiers,
 * review decisions (with self-approval denial + auto-depublication),
 * qualification evidence review. Mutations are audit-logged.
 */
@Injectable()
export class TutorVerificationService {
  private readonly logger = new Logger(TutorVerificationService.name);

  constructor(
    @InjectRepository(TutorProfileEntity)
    private readonly profileRepo: Repository<TutorProfileEntity>,
    @InjectRepository(TutorQualificationEntity)
    private readonly qualificationRepo: Repository<TutorQualificationEntity>,
    @InjectRepository(TutorVerificationReviewEntity)
    private readonly reviewRepo: Repository<TutorVerificationReviewEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
    @Optional()
    @Inject(NotificationService)
    private readonly notificationService?: NotificationService,
  ) {}

  async getPendingVerificationTutors() {
    const profiles = await this.profileRepo.find({
      where: { verificationStatus: In(['submitted', 'under_review', 'needs_information']) },
      relations: { qualifications: true },
      order: { updatedAt: 'ASC' },
    });
    const userIds = profiles.map((p) => p.userId);
    const users =
      userIds.length > 0 ? await this.userRepo.find({ where: { id: In(userIds) } }) : [];
    return profiles.map((p) => {
      const u = users.find((user) => user.id === p.userId);
      return {
        userId: p.userId,
        displayName: u?.displayName || 'Unknown',
        email: u?.email,
        phoneE164: u?.phoneE164,
        headline: p.headline,
        verificationStatus: p.verificationStatus,
        publicationStatus: p.publicationStatus,
        qualificationsCount: (p.qualifications || []).length,
        submittedAt: p.updatedAt,
      };
    });
  }

  async getReviewDossier(tutorId: string) {
    const profile = await this.profileRepo.findOne({
      where: { userId: tutorId },
      relations: { qualifications: true, subjects: true, serviceAreas: true, availabilities: true },
    });
    if (!profile) {
      throw new NotFoundException(`Tutor profile not found for user: ${tutorId}`);
    }
    const user = await this.userRepo.findOne({ where: { id: tutorId } });
    const reviewHistory = await this.reviewRepo.find({
      where: { tutorUserId: tutorId },
      order: { createdAt: 'DESC' },
    });
    return {
      profile,
      user: user
        ? {
            id: user.id,
            displayName: user.displayName,
            email: user.email,
            phoneE164: user.phoneE164,
            status: user.status,
            createdAt: user.createdAt,
          }
        : null,
      reviewHistory,
    };
  }

  async submitReviewDecision(
    reviewer: AuthenticatedUser,
    tutorId: string,
    dto: AdminReviewTutorDto,
  ): Promise<TutorVerificationReviewEntity> {
    if (reviewer.id === tutorId) {
      throw new ForbiddenException(
        'Self-approval denial: Reviewer cannot verify, approve, or alter their own tutor profile.',
      );
    }
    const profile = await this.profileRepo.findOne({ where: { userId: tutorId } });
    if (!profile) {
      throw new NotFoundException(`Tutor profile not found for user: ${tutorId}`);
    }
    const policyVersion = dto.policyVersion || TUTOR_VERIFICATION_POLICY_VERSION;
    const review = this.reviewRepo.create({
      tutorUserId: tutorId,
      reviewerUserId: reviewer.id,
      decision: dto.decision,
      reasonCode: dto.reasonCode,
      internalNotes: dto.internalNotes ?? null,
      policyVersion,
    });
    const savedReview = await this.reviewRepo.save(review);
    switch (dto.decision) {
      case 'approved':
        profile.verificationStatus = 'approved';
        break;
      case 'rejected':
        profile.verificationStatus = 'rejected';
        profile.publicationStatus = 'unpublished';
        break;
      case 'needs_information':
        profile.verificationStatus = 'needs_information';
        break;
      case 'suspended':
        profile.verificationStatus = 'suspended';
        profile.publicationStatus = 'unpublished';
        break;
      case 'reinstated':
        profile.verificationStatus = 'approved';
        break;
    }
    profile.profileUpdatedAt = new Date();
    await this.profileRepo.save(profile);
    await this.auditService.record({
      actorUserId: reviewer.id,
      action: 'tutor.verification.reviewed',
      resourceType: 'tutor_profile',
      resourceId: tutorId,
      reason: dto.reasonCode,
      safeMetadata: {
        decision: dto.decision,
        policyVersion,
        internalNotesPresent: Boolean(dto.internalNotes),
      },
    });
    if (this.notificationService) {
      try {
        if (dto.decision === 'approved' || dto.decision === 'reinstated') {
          await this.notificationService.dispatch({
            userId: tutorId,
            eventType: 'tutor.verified',
            recipientRole: 'tutor',
            payload: {},
          });
        } else if (dto.decision === 'needs_information') {
          await this.notificationService.dispatch({
            userId: tutorId,
            eventType: 'tutor.needs_information',
            recipientRole: 'tutor',
            payload: { notes: dto.internalNotes || dto.reasonCode },
          });
        } else if (dto.decision === 'rejected') {
          await this.notificationService.dispatch({
            userId: tutorId,
            eventType: 'tutor.rejected',
            recipientRole: 'tutor',
            payload: { notes: dto.internalNotes || dto.reasonCode },
          });
        }
      } catch (err) {
        this.logger.warn(
          `Failed to dispatch verification notification to tutor ${tutorId}: ${err}`,
        );
      }
    }
    return savedReview;
  }

  async verifyQualification(
    reviewer: AuthenticatedUser,
    tutorId: string,
    qualificationId: string,
    reviewStatus: 'approved' | 'rejected',
  ): Promise<TutorQualificationEntity> {
    if (reviewer.id === tutorId) {
      throw new ForbiddenException(
        'Self-approval denial: Reviewer cannot verify qualifications on their own profile.',
      );
    }
    const qualification = await this.qualificationRepo.findOne({
      where: { id: qualificationId, tutorUserId: tutorId },
    });
    if (!qualification) {
      throw new NotFoundException(
        `Qualification not found for tutor ${tutorId}: ${qualificationId}`,
      );
    }
    qualification.reviewStatus = reviewStatus;
    const saved = await this.qualificationRepo.save(qualification);
    await this.auditService.record({
      actorUserId: reviewer.id,
      action: 'tutor.qualification.reviewed',
      resourceType: 'tutor_qualification',
      resourceId: qualificationId,
      safeMetadata: { tutorId, reviewStatus },
    });
    return saved;
  }
}
