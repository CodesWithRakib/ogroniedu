import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Optional,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { TutorProfileEntity, PublicationStatus } from './entities/tutor-profile.entity';
import { TutorQualificationEntity } from './entities/tutor-qualification.entity';
import { TutorVerificationReviewEntity } from './entities/tutor-verification-review.entity';
import { TutorSubjectEntity } from './entities/tutor-subject.entity';
import { TutorServiceAreaEntity } from './entities/tutor-service-area.entity';
import { TutorAvailabilityEntity } from './entities/tutor-availability.entity';
import { FileAssetEntity } from '../files/entities/file-asset.entity';
import { UserEntity } from '../auth/entities/user.entity';
import { SubjectEntity } from '../taxonomy/entities/subject.entity';
import { EducationLevelEntity } from '../taxonomy/entities/education-level.entity';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notifications/notification.service';
import {
  UpdateTutorProfileDto,
  AddTutorQualificationDto,
  AddTutorSubjectDto,
  ServiceAreaItemDto,
  AvailabilitySlotItemDto,
  AdminReviewTutorDto,
  TutorPublicProfileDto,
} from './dto';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

export const TUTOR_VERIFICATION_POLICY_VERSION = 'v1.0-bd-tutor-verification';

@Injectable()
export class TutorsService {
  private readonly logger = new Logger(TutorsService.name);

  constructor(
    @InjectRepository(TutorProfileEntity)
    private readonly profileRepo: Repository<TutorProfileEntity>,
    @InjectRepository(TutorQualificationEntity)
    private readonly qualificationRepo: Repository<TutorQualificationEntity>,
    @InjectRepository(TutorVerificationReviewEntity)
    private readonly reviewRepo: Repository<TutorVerificationReviewEntity>,
    @InjectRepository(TutorSubjectEntity)
    private readonly subjectRepo: Repository<TutorSubjectEntity>,
    @InjectRepository(TutorServiceAreaEntity)
    private readonly serviceAreaRepo: Repository<TutorServiceAreaEntity>,
    @InjectRepository(TutorAvailabilityEntity)
    private readonly availabilityRepo: Repository<TutorAvailabilityEntity>,
    @InjectRepository(FileAssetEntity)
    private readonly fileRepo: Repository<FileAssetEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(SubjectEntity)
    private readonly taxonomySubjectRepo: Repository<SubjectEntity>,
    @InjectRepository(EducationLevelEntity)
    private readonly taxonomyLevelRepo: Repository<EducationLevelEntity>,
    private readonly auditService: AuditService,
    @Optional()
    @Inject(NotificationService)
    private readonly notificationService?: NotificationService,
  ) {}

  /**
   * Ensure a tutor profile row exists for the given user, or create one with defaults
   */
  async getOrCreateProfile(userId: string): Promise<TutorProfileEntity> {
    let profile = await this.profileRepo.findOne({
      where: { userId },
      relations: {
        qualifications: true,
        subjects: true,
        serviceAreas: true,
        availabilities: true,
      },
    });

    if (!profile) {
      profile = this.profileRepo.create({
        userId,
        verificationStatus: 'not_submitted',
        publicationStatus: 'draft',
        currency: 'BDT',
        teachingModes: [],
      });
      profile = await this.profileRepo.save(profile);
      profile.qualifications = [];
      profile.subjects = [];
      profile.serviceAreas = [];
      profile.availabilities = [];
    }

    return profile;
  }

  /**
   * Get own full profile with all related data (private view)
   */
  async getOwnProfile(userId: string) {
    const profile = await this.getOrCreateProfile(userId);
    const user = await this.userRepo.findOne({ where: { id: userId } });

    return {
      profile,
      user: user
        ? {
            id: user.id,
            displayName: user.displayName,
            email: user.email,
            phoneE164: user.phoneE164,
            preferredLocale: user.preferredLocale,
          }
        : null,
    };
  }

  /**
   * Update own profile basics
   * INVARIANT: Tutors cannot change their own verificationStatus here (Self-Approval Denial)
   */
  async updateOwnProfile(userId: string, dto: UpdateTutorProfileDto): Promise<TutorProfileEntity> {
    const profile = await this.getOrCreateProfile(userId);

    if (dto.headline !== undefined) profile.headline = dto.headline;
    if (dto.bio !== undefined) profile.bio = dto.bio;
    if (dto.yearsExperience !== undefined) profile.yearsExperience = dto.yearsExperience;
    if (dto.teachingModes !== undefined) profile.teachingModes = dto.teachingModes;
    if (dto.hourlyRateMinor !== undefined) profile.hourlyRateMinor = String(dto.hourlyRateMinor);
    if (dto.currency !== undefined) profile.currency = dto.currency;

    profile.profileUpdatedAt = new Date();
    const updated = await this.profileRepo.save(profile);

    await this.auditService.record({
      actorUserId: userId,
      action: 'tutor.profile.updated',
      resourceType: 'tutor_profile',
      resourceId: userId,
      safeMetadata: {
        headline: dto.headline,
        yearsExperience: dto.yearsExperience,
        teachingModes: dto.teachingModes,
        hourlyRateMinor: dto.hourlyRateMinor,
      },
    });

    return updated;
  }

  /**
   * Submit profile for verification review
   */
  async submitVerification(userId: string): Promise<TutorProfileEntity> {
    const profile = await this.getOrCreateProfile(userId);

    if (profile.verificationStatus === 'approved') {
      throw new BadRequestException('Tutor profile is already verified and approved.');
    }

    // Must have at least basic fields filled
    if (!profile.headline && !profile.bio) {
      throw new BadRequestException(
        'Please complete your headline or biography before submitting for verification.',
      );
    }

    if (!profile.teachingModes || profile.teachingModes.length === 0) {
      throw new BadRequestException(
        'Please select at least one teaching mode (In-person, Online, or Hybrid).',
      );
    }

    // Must have at least 1 qualification submitted
    const qualificationsCount = await this.qualificationRepo.count({
      where: { tutorUserId: userId },
    });

    if (qualificationsCount === 0) {
      throw new BadRequestException(
        'Please upload at least one qualification or identity document (NID or Academic Degree) before submitting.',
      );
    }

    profile.verificationStatus = 'submitted';
    profile.profileUpdatedAt = new Date();
    const saved = await this.profileRepo.save(profile);

    await this.auditService.record({
      actorUserId: userId,
      action: 'tutor.verification.submitted',
      resourceType: 'tutor_profile',
      resourceId: userId,
      safeMetadata: {
        policyVersion: TUTOR_VERIFICATION_POLICY_VERSION,
        qualificationsCount,
      },
    });

    return saved;
  }

  /**
   * Set publication status (draft, published, unpublished)
   * INVARIANT: Cannot publish if verificationStatus !== 'approved', or if no subjects/availability exist
   */
  async setPublicationStatus(
    userId: string,
    publicationStatus: PublicationStatus,
  ): Promise<TutorProfileEntity> {
    const profile = await this.getOrCreateProfile(userId);

    if (publicationStatus === 'published') {
      // 1. Must be verified
      if (profile.verificationStatus !== 'approved') {
        throw new BadRequestException(
          `Cannot publish profile. Current verification status is '${profile.verificationStatus}'. Verification approval is required before publication.`,
        );
      }

      // 2. Must have at least one teaching subject
      const subjectsCount = await this.subjectRepo.count({
        where: { tutorUserId: userId },
      });
      if (subjectsCount === 0) {
        throw new BadRequestException(
          'Cannot publish profile without at least one configured teaching subject.',
        );
      }

      // 3. Must have at least one availability slot
      const availabilityCount = await this.availabilityRepo.count({
        where: { tutorUserId: userId, isActive: true },
      });
      if (availabilityCount === 0) {
        throw new BadRequestException(
          'Cannot publish profile without configuring active availability slots.',
        );
      }
    }

    profile.publicationStatus = publicationStatus;
    profile.profileUpdatedAt = new Date();
    const saved = await this.profileRepo.save(profile);

    await this.auditService.record({
      actorUserId: userId,
      action: 'tutor.publication.updated',
      resourceType: 'tutor_profile',
      resourceId: userId,
      safeMetadata: { publicationStatus },
    });

    return saved;
  }

  /**
   * Add a qualification with private evidence asset
   */
  async addQualification(
    userId: string,
    dto: AddTutorQualificationDto,
  ): Promise<TutorQualificationEntity> {
    await this.getOrCreateProfile(userId);

    // If an evidence asset ID is provided, verify it exists and is owned by this tutor
    if (dto.evidenceAssetId) {
      const fileAsset = await this.fileRepo.findOne({
        where: { id: dto.evidenceAssetId, deletedAt: undefined },
      });

      if (!fileAsset || fileAsset.ownerUserId !== userId) {
        throw new BadRequestException(
          'The specified evidence document does not exist or does not belong to your account.',
        );
      }
    }

    const qualification = this.qualificationRepo.create({
      tutorUserId: userId,
      qualificationType: dto.qualificationType,
      title: dto.title,
      institution: dto.institution ?? null,
      issuedYear: dto.issuedYear ?? null,
      expiresOn: dto.expiresOn ?? null,
      evidenceAssetId: dto.evidenceAssetId ?? null,
      reviewStatus: 'pending',
    });

    const saved = await this.qualificationRepo.save(qualification);

    await this.auditService.record({
      actorUserId: userId,
      action: 'tutor.qualification.added',
      resourceType: 'tutor_qualification',
      resourceId: saved.id,
      safeMetadata: {
        qualificationType: dto.qualificationType,
        title: dto.title,
        evidenceAssetId: dto.evidenceAssetId,
      },
    });

    return saved;
  }

  /**
   * Delete a qualification owned by the tutor
   */
  async deleteQualification(userId: string, qualificationId: string): Promise<boolean> {
    const qualification = await this.qualificationRepo.findOne({
      where: { id: qualificationId, tutorUserId: userId },
    });

    if (!qualification) {
      throw new NotFoundException(`Qualification not found: ${qualificationId}`);
    }

    await this.qualificationRepo.remove(qualification);

    await this.auditService.record({
      actorUserId: userId,
      action: 'tutor.qualification.deleted',
      resourceType: 'tutor_qualification',
      resourceId: qualificationId,
    });

    return true;
  }

  /**
   * Add or upsert a teaching subject specialization
   */
  async addSubject(userId: string, dto: AddTutorSubjectDto): Promise<TutorSubjectEntity> {
    await this.getOrCreateProfile(userId);

    let subject = await this.subjectRepo.findOne({
      where: {
        tutorUserId: userId,
        subjectId: dto.subjectId,
        educationLevelId: dto.educationLevelId,
        curriculumId: dto.curriculumId ?? undefined,
        stream: dto.stream ?? undefined,
      },
    });

    if (!subject) {
      subject = this.subjectRepo.create({
        tutorUserId: userId,
        subjectId: dto.subjectId,
        educationLevelId: dto.educationLevelId,
        curriculumId: dto.curriculumId ?? null,
        stream: dto.stream ?? null,
        rateMinor: dto.rateMinor ? String(dto.rateMinor) : null,
        currency: dto.currency ?? 'BDT',
      });
    } else {
      if (dto.rateMinor !== undefined) subject.rateMinor = String(dto.rateMinor);
      if (dto.currency !== undefined) subject.currency = dto.currency;
    }

    const saved = await this.subjectRepo.save(subject);

    await this.auditService.record({
      actorUserId: userId,
      action: 'tutor.subject.added',
      resourceType: 'tutor_subject',
      resourceId: saved.id,
      safeMetadata: { subjectId: dto.subjectId, educationLevelId: dto.educationLevelId },
    });

    return saved;
  }

  /**
   * Delete a teaching subject specialization
   */
  async deleteSubject(userId: string, subjectEntryId: string): Promise<boolean> {
    const entry = await this.subjectRepo.findOne({
      where: { id: subjectEntryId, tutorUserId: userId },
    });

    if (!entry) {
      throw new NotFoundException(`Tutor subject entry not found: ${subjectEntryId}`);
    }

    await this.subjectRepo.remove(entry);

    await this.auditService.record({
      actorUserId: userId,
      action: 'tutor.subject.deleted',
      resourceType: 'tutor_subject',
      resourceId: subjectEntryId,
    });

    return true;
  }

  /**
   * Replace all service areas for the tutor
   */
  async setServiceAreas(
    userId: string,
    areas: ServiceAreaItemDto[],
  ): Promise<TutorServiceAreaEntity[]> {
    await this.getOrCreateProfile(userId);

    // Delete existing
    await this.serviceAreaRepo.delete({ tutorUserId: userId });

    if (!areas || areas.length === 0) {
      return [];
    }

    const entities = areas.map((a) =>
      this.serviceAreaRepo.create({
        tutorUserId: userId,
        districtCode: a.districtCode,
        upazilaCode: a.upazilaCode ?? null,
        localityName: a.localityName ?? null,
        radiusKm: a.radiusKm ?? null,
      }),
    );

    const saved = await this.serviceAreaRepo.save(entities);

    await this.auditService.record({
      actorUserId: userId,
      action: 'tutor.service_areas.updated',
      resourceType: 'tutor_service_areas',
      resourceId: userId,
      safeMetadata: { count: saved.length },
    });

    return saved;
  }

  /**
   * Replace all recurring weekly availability slots for the tutor
   */
  async setAvailability(
    userId: string,
    slots: AvailabilitySlotItemDto[],
  ): Promise<TutorAvailabilityEntity[]> {
    await this.getOrCreateProfile(userId);

    // Validate times
    for (const slot of slots) {
      if (slot.startLocal >= slot.endLocal) {
        throw new BadRequestException(
          `Invalid availability slot on weekday ${slot.weekday}: start time (${slot.startLocal}) must be strictly before end time (${slot.endLocal}).`,
        );
      }
    }

    // Delete existing
    await this.availabilityRepo.delete({ tutorUserId: userId });

    if (!slots || slots.length === 0) {
      return [];
    }

    const entities = slots.map((s) =>
      this.availabilityRepo.create({
        tutorUserId: userId,
        weekday: s.weekday,
        startLocal: s.startLocal,
        endLocal: s.endLocal,
        timezone: s.timezone ?? 'Asia/Dhaka',
        isActive: true,
      }),
    );

    const saved = await this.availabilityRepo.save(entities);

    await this.auditService.record({
      actorUserId: userId,
      action: 'tutor.availability.updated',
      resourceType: 'tutor_availability',
      resourceId: userId,
      safeMetadata: { slotCount: saved.length },
    });

    return saved;
  }

  /**
   * Get sanitized and redacted public profile
   * Definition of Done: "Badge reflects only checks actually performed"
   */
  async getPublicProfile(tutorUserId: string): Promise<TutorPublicProfileDto> {
    const profile = await this.profileRepo.findOne({
      where: { userId: tutorUserId },
      relations: {
        qualifications: true,
        subjects: true,
        serviceAreas: true,
        availabilities: true,
      },
    });

    if (
      !profile ||
      profile.publicationStatus !== 'published' ||
      profile.verificationStatus !== 'approved'
    ) {
      throw new NotFoundException('Tutor profile is not published or verified.');
    }

    const user = await this.userRepo.findOne({ where: { id: tutorUserId } });
    if (!user || user.status !== 'active') {
      throw new NotFoundException('Tutor account is inactive or not found.');
    }

    // Dynamic badges: only checks actually performed
    const badges: string[] = ['verified_tutor'];

    const approvedQualifications = (profile.qualifications || []).filter(
      (q) => q.reviewStatus === 'approved',
    );

    const hasApprovedIdentity = approvedQualifications.some((q) => q.qualificationType === 'nid');
    if (hasApprovedIdentity) {
      badges.push('verified_identity');
    }

    const hasApprovedAcademic = approvedQualifications.some(
      (q) => q.qualificationType === 'academic_certificate' || q.qualificationType === 'degree',
    );
    if (hasApprovedAcademic) {
      badges.push('verified_academic');
    }

    // Resolve subject taxonomies for public view
    const subjectIds = (profile.subjects || []).map((s) => s.subjectId);
    const levelIds = (profile.subjects || []).map((s) => s.educationLevelId);

    const taxonomySubjects =
      subjectIds.length > 0
        ? await this.taxonomySubjectRepo.find({ where: { id: In(subjectIds) } })
        : [];
    const taxonomyLevels =
      levelIds.length > 0 ? await this.taxonomyLevelRepo.find({ where: { id: In(levelIds) } }) : [];

    const publicSubjects = (profile.subjects || []).map((s) => {
      const sub = taxonomySubjects.find((t) => t.id === s.subjectId);
      const lvl = taxonomyLevels.find((l) => l.id === s.educationLevelId);
      return {
        id: s.id,
        subjectCode: sub?.code || 'unknown',
        subjectNameEn: sub?.nameEn || 'Subject',
        subjectNameBn: sub?.nameBn || 'বিষয়',
        educationLevelCode: lvl?.code || 'unknown',
        educationLevelNameEn: lvl?.nameEn || 'Level',
        educationLevelNameBn: lvl?.nameBn || 'শ্রেণি',
        curriculumCode: s.curriculumId,
        rateMinor: s.rateMinor || profile.hourlyRateMinor,
      };
    });

    const publicServiceAreas = (profile.serviceAreas || []).map((a) => ({
      id: a.id,
      districtCode: a.districtCode,
      upazilaCode: a.upazilaCode,
      localityName: a.localityName,
      radiusKm: a.radiusKm ? Number(a.radiusKm) : null,
    }));

    const publicAvailability = (profile.availabilities || [])
      .filter((av) => av.isActive)
      .map((av) => ({
        weekday: av.weekday,
        startLocal: av.startLocal,
        endLocal: av.endLocal,
        timezone: av.timezone,
      }));

    return {
      id: profile.userId,
      displayName: user.displayName,
      headline: profile.headline,
      bio: profile.bio,
      yearsExperience: profile.yearsExperience,
      teachingModes: profile.teachingModes,
      hourlyRateMinor: profile.hourlyRateMinor,
      currency: profile.currency,
      responseTimeMinutes: profile.responseTimeMinutes,
      badges,
      subjects: publicSubjects,
      serviceAreas: publicServiceAreas,
      availability: publicAvailability,
    };
  }

  // ============================================================================
  // ADMIN REVIEW & VERIFICATION WORKFLOW
  // ============================================================================

  /**
   * List tutors currently pending compliance verification
   */
  async getPendingVerificationTutors() {
    const profiles = await this.profileRepo.find({
      where: {
        verificationStatus: In(['submitted', 'under_review', 'needs_information']),
      },
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

  /**
   * Get full review dossier for compliance admin inspection
   */
  async getReviewDossier(tutorId: string) {
    const profile = await this.profileRepo.findOne({
      where: { userId: tutorId },
      relations: {
        qualifications: true,
        subjects: true,
        serviceAreas: true,
        availabilities: true,
      },
    });

    if (!profile) {
      throw new NotFoundException(`Tutor profile not found for user: ${tutorId}`);
    }

    const user = await this.userRepo.findOne({ where: { id: tutorId } });

    // Fetch review history
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

  /**
   * Submit compliance review decision on tutor profile
   * INVARIANT: Self-approval denial - reviewer cannot review their own tutor profile
   */
  async submitReviewDecision(
    reviewer: AuthenticatedUser,
    tutorId: string,
    dto: AdminReviewTutorDto,
  ): Promise<TutorVerificationReviewEntity> {
    // 1. Self-approval denial invariant
    if (reviewer.id === tutorId) {
      throw new ForbiddenException(
        'Self-approval denial: Reviewer cannot verify, approve, or alter their own tutor profile.',
      );
    }

    const profile = await this.profileRepo.findOne({ where: { userId: tutorId } });
    if (!profile) {
      throw new NotFoundException(`Tutor profile not found for user: ${tutorId}`);
    }

    // 2. Record review audit record
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

    // 3. Update tutor profile verification status
    switch (dto.decision) {
      case 'approved':
        profile.verificationStatus = 'approved';
        break;
      case 'rejected':
        profile.verificationStatus = 'rejected';
        profile.publicationStatus = 'unpublished'; // Automated depublication
        break;
      case 'needs_information':
        profile.verificationStatus = 'needs_information';
        break;
      case 'suspended':
        profile.verificationStatus = 'suspended';
        profile.publicationStatus = 'unpublished'; // Automated depublication
        break;
      case 'reinstated':
        profile.verificationStatus = 'approved';
        break;
    }

    profile.profileUpdatedAt = new Date();
    await this.profileRepo.save(profile);

    // 4. Record global security audit log
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

    // 5. Dispatch notification to tutor
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
        }
      } catch (err) {
        this.logger.warn(
          `Failed to dispatch verification notification to tutor ${tutorId}: ${err}`,
        );
      }
    }

    return savedReview;
  }

  /**
   * Verify individual qualification evidence document
   * INVARIANT: Reviewer cannot verify qualification on own profile
   */
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
