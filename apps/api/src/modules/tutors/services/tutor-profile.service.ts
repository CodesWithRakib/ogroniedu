import { Injectable, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { TutorProfileEntity, PublicationStatus } from '../entities/tutor-profile.entity';
import { TutorQualificationEntity } from '../entities/tutor-qualification.entity';
import { TutorSubjectEntity } from '../entities/tutor-subject.entity';
import { TutorServiceAreaEntity } from '../entities/tutor-service-area.entity';
import { TutorAvailabilityEntity } from '../entities/tutor-availability.entity';
import { FileAssetEntity } from '../../files/entities/file-asset.entity';
import { UserEntity } from '../../auth/entities/user.entity';
import { AuditService } from '../../audit/audit.service';
import {
  UpdateTutorProfileDto,
  AddTutorQualificationDto,
  AddTutorSubjectDto,
  ServiceAreaItemDto,
  AvailabilitySlotItemDto,
} from '../dto';

/**
 * Own-profile lifecycle: get-or-create, updates, qualifications, subjects,
 * service areas, availability, verification submission, publication gating.
 * Does not handle discovery search or admin review decisions.
 */
@Injectable()
export class TutorProfileService {
  constructor(
    @InjectRepository(TutorProfileEntity)
    private readonly profileRepo: Repository<TutorProfileEntity>,
    @InjectRepository(TutorQualificationEntity)
    private readonly qualificationRepo: Repository<TutorQualificationEntity>,
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
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
  ) {}

  async getOrCreateProfile(userId: string): Promise<TutorProfileEntity> {
    let profile = await this.profileRepo.findOne({
      where: { userId },
      relations: { qualifications: true, subjects: true, serviceAreas: true, availabilities: true },
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

  async submitVerification(userId: string): Promise<TutorProfileEntity> {
    const profile = await this.getOrCreateProfile(userId);
    if (profile.verificationStatus === 'approved') {
      throw new BadRequestException('Tutor profile is already verified and approved.');
    }
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
      safeMetadata: { qualificationsCount },
    });
    return saved;
  }

  async setPublicationStatus(
    userId: string,
    publicationStatus: PublicationStatus,
  ): Promise<TutorProfileEntity> {
    const profile = await this.getOrCreateProfile(userId);
    if (publicationStatus === 'published') {
      if (profile.verificationStatus !== 'approved') {
        throw new BadRequestException(
          `Cannot publish profile. Current verification status is '${profile.verificationStatus}'. Verification approval is required before publication.`,
        );
      }
      const subjectsCount = await this.subjectRepo.count({ where: { tutorUserId: userId } });
      if (subjectsCount === 0) {
        throw new BadRequestException(
          'Cannot publish profile without at least one configured teaching subject.',
        );
      }
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

  async addQualification(
    userId: string,
    dto: AddTutorQualificationDto,
  ): Promise<TutorQualificationEntity> {
    await this.getOrCreateProfile(userId);
    if (dto.evidenceAssetId) {
      const fileAsset = await this.fileRepo.findOne({
        where: { id: dto.evidenceAssetId, deletedAt: IsNull() },
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

  async addSubject(userId: string, dto: AddTutorSubjectDto): Promise<TutorSubjectEntity> {
    await this.getOrCreateProfile(userId);
    let subject = await this.subjectRepo.findOne({
      where: {
        tutorUserId: userId,
        subjectId: dto.subjectId,
        educationLevelId: dto.educationLevelId,
        curriculumId: dto.curriculumId ?? IsNull(),
        stream: dto.stream ?? IsNull(),
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

  async setServiceAreas(
    userId: string,
    areas: ServiceAreaItemDto[],
  ): Promise<TutorServiceAreaEntity[]> {
    await this.getOrCreateProfile(userId);
    await this.serviceAreaRepo.delete({ tutorUserId: userId });
    if (!areas || areas.length === 0) return [];
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

  async setAvailability(
    userId: string,
    slots: AvailabilitySlotItemDto[],
  ): Promise<TutorAvailabilityEntity[]> {
    await this.getOrCreateProfile(userId);
    for (const slot of slots) {
      if (slot.startLocal >= slot.endLocal) {
        throw new BadRequestException(
          `Invalid availability slot on weekday ${slot.weekday}: start time (${slot.startLocal}) must be strictly before end time (${slot.endLocal}).`,
        );
      }
    }
    await this.availabilityRepo.delete({ tutorUserId: userId });
    if (!slots || slots.length === 0) return [];
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
}
