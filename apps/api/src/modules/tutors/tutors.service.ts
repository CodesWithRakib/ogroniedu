import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { TutorProfileService } from './services/tutor-profile.service';
import { TutorSearchService } from './services/tutor-search.service';
import { TutorVerificationService } from './services/tutor-verification.service';
import {
  UpdateTutorProfileDto,
  AddTutorQualificationDto,
  AddTutorSubjectDto,
  ServiceAreaItemDto,
  AvailabilitySlotItemDto,
  AdminReviewTutorDto,
} from './dto';
import { PublicationStatus } from './entities/tutor-profile.entity';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

export { TUTOR_VERIFICATION_POLICY_VERSION } from './constants/tutor.constants';

/**
 * Backward-compatible facade over the split tutor domain services.
 * Controllers and other modules keep importing TutorsService; new code
 * should inject TutorProfileService / TutorSearchService / TutorVerificationService directly.
 */
@Injectable()
export class TutorsService {
  constructor(
    @Inject(forwardRef(() => TutorProfileService))
    private readonly profiles: TutorProfileService,
    @Inject(forwardRef(() => TutorSearchService))
    private readonly search: TutorSearchService,
    @Inject(forwardRef(() => TutorVerificationService))
    private readonly verification: TutorVerificationService,
  ) {}

  getOrCreateProfile(userId: string) {
    return this.profiles.getOrCreateProfile(userId);
  }
  getOwnProfile(userId: string) {
    return this.profiles.getOwnProfile(userId);
  }
  updateOwnProfile(userId: string, dto: UpdateTutorProfileDto) {
    return this.profiles.updateOwnProfile(userId, dto);
  }
  submitVerification(userId: string) {
    return this.profiles.submitVerification(userId);
  }
  setPublicationStatus(userId: string, status: PublicationStatus) {
    return this.profiles.setPublicationStatus(userId, status);
  }
  addQualification(userId: string, dto: AddTutorQualificationDto) {
    return this.profiles.addQualification(userId, dto);
  }
  deleteQualification(userId: string, qualificationId: string) {
    return this.profiles.deleteQualification(userId, qualificationId);
  }
  addSubject(userId: string, dto: AddTutorSubjectDto) {
    return this.profiles.addSubject(userId, dto);
  }
  deleteSubject(userId: string, subjectEntryId: string) {
    return this.profiles.deleteSubject(userId, subjectEntryId);
  }
  setServiceAreas(userId: string, areas: ServiceAreaItemDto[]) {
    return this.profiles.setServiceAreas(userId, areas);
  }
  setAvailability(userId: string, slots: AvailabilitySlotItemDto[]) {
    return this.profiles.setAvailability(userId, slots);
  }
  getPublicProfile(tutorUserId: string) {
    return this.search.getPublicProfile(tutorUserId);
  }
  searchTutors(query: Parameters<TutorSearchService['searchTutors']>[0]) {
    return this.search.searchTutors(query);
  }
  getPendingVerificationTutors() {
    return this.verification.getPendingVerificationTutors();
  }
  getReviewDossier(tutorId: string) {
    return this.verification.getReviewDossier(tutorId);
  }
  submitReviewDecision(reviewer: AuthenticatedUser, tutorId: string, dto: AdminReviewTutorDto) {
    return this.verification.submitReviewDecision(reviewer, tutorId, dto);
  }
  verifyQualification(
    reviewer: AuthenticatedUser,
    tutorId: string,
    qualificationId: string,
    reviewStatus: 'approved' | 'rejected',
  ) {
    return this.verification.verifyQualification(reviewer, tutorId, qualificationId, reviewStatus);
  }
}
