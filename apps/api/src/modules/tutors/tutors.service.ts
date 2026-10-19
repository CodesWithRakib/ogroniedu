import { Injectable, Inject, Optional, BadRequestException, forwardRef } from '@nestjs/common';
import { TutorProfileService } from './services/tutor-profile.service';
import { TutorSearchService } from './services/tutor-search.service';
import { TutorVerificationService } from './services/tutor-verification.service';
import { TutorDossierService } from './services/tutor-dossier.service';
import { TutorVerificationExpiryService } from './services/tutor-verification-expiry.service';
import { TutorAvailabilityService } from './services/tutor-availability.service';
import {
  UpdateTutorProfileDto,
  AddTutorQualificationDto,
  AddTutorSubjectDto,
  ServiceAreaItemDto,
  AvailabilitySlotItemDto,
  AdminReviewTutorDto,
  AddVerificationDocumentDto,
  CreateBlockedPeriodDto,
  ReviewerDecisionDto,
  VerifyVerificationDocumentDto,
  VerificationQueueQueryDto,
} from './dto';
import { PublicationStatus } from './entities/tutor-profile.entity';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { TUTOR_VERIFICATION_POLICY_VERSION } from './constants/tutor.constants';
import type { TutorVerificationLevel } from '@ogroniedu/contracts';

export { TUTOR_VERIFICATION_POLICY_VERSION } from './constants/tutor.constants';

/**
 * Backward-compatible facade over the split tutor domain services.
 * Controllers and other modules keep importing TutorsService; new code
 * should inject TutorProfileService / TutorSearchService / TutorVerificationService /
 * TutorDossierService directly.
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
    @Optional()
    @Inject(forwardRef(() => TutorDossierService))
    private readonly dossier?: TutorDossierService,
    @Optional()
    @Inject(forwardRef(() => TutorVerificationExpiryService))
    private readonly expiry?: TutorVerificationExpiryService,
    @Optional()
    @Inject(forwardRef(() => TutorAvailabilityService))
    private readonly availability?: TutorAvailabilityService,
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
  /**
   * Legacy coarse submission. Routes through the level workflow whenever the
   * dossier service is wired so the derived profile status always comes from
   * the level rows; the direct profile write is only the fallback for isolated
   * unit tests.
   */
  submitVerification(userId: string) {
    if (!this.dossier) return this.profiles.submitVerification(userId);
    return this.dossier.submitAllLevels(userId, TUTOR_VERIFICATION_POLICY_VERSION);
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
  getAvailability(userId: string) {
    return this.requireAvailability().getAvailability(userId);
  }
  getBlockedPeriods(userId: string, from?: Date, to?: Date) {
    return this.requireAvailability().getBlockedPeriods(userId, from, to);
  }
  addBlockedPeriod(userId: string, dto: CreateBlockedPeriodDto) {
    return this.requireAvailability().addBlockedPeriod(userId, dto);
  }
  removeBlockedPeriod(userId: string, id: string) {
    return this.requireAvailability().removeBlockedPeriod(userId, id);
  }
  private requireAvailability(): TutorAvailabilityService {
    if (!this.availability) {
      throw new BadRequestException('Tutor availability service is not configured.');
    }
    return this.availability;
  }
  getPublicProfile(tutorUserId: string) {
    return this.search.getPublicProfile(tutorUserId);
  }
  searchTutors(query: Parameters<TutorSearchService['searchTutors']>[0]) {
    return this.search.searchTutors(query);
  }

  // --------------------------------------------------------------------------
  // Three-level verification dossier (Phase 02)
  // --------------------------------------------------------------------------

  getOwnDossier(userId: string) {
    return this.requireDossier().getOwnDossier(userId, TUTOR_VERIFICATION_POLICY_VERSION);
  }
  addVerificationDocument(
    userId: string,
    level: TutorVerificationLevel,
    dto: AddVerificationDocumentDto,
  ) {
    return this.requireDossier().addDocument(userId, level, dto, TUTOR_VERIFICATION_POLICY_VERSION);
  }
  deleteVerificationDocument(userId: string, documentId: string) {
    return this.requireDossier().deleteDocument(
      userId,
      documentId,
      TUTOR_VERIFICATION_POLICY_VERSION,
    );
  }
  submitVerificationLevel(userId: string, level: TutorVerificationLevel) {
    return this.requireDossier().submitLevel(userId, level, TUTOR_VERIFICATION_POLICY_VERSION);
  }
  reopenVerificationLevel(userId: string, level: TutorVerificationLevel) {
    return this.requireDossier().reopenLevel(userId, level, TUTOR_VERIFICATION_POLICY_VERSION);
  }

  getPendingVerificationTutors() {
    return this.verification.getPendingVerificationTutors();
  }
  getVerificationQueue(reviewer: AuthenticatedUser, query: VerificationQueueQueryDto) {
    return this.verification.getVerificationQueue(reviewer, query);
  }
  getReviewDossier(tutorId: string, reviewer?: AuthenticatedUser) {
    return this.verification.getReviewDossier(tutorId, reviewer);
  }
  decideVerificationLevel(
    reviewer: AuthenticatedUser,
    tutorId: string,
    level: TutorVerificationLevel,
    dto: ReviewerDecisionDto,
  ) {
    return this.verification.decideLevel(reviewer, tutorId, level, dto);
  }
  verifyVerificationDocument(
    reviewer: AuthenticatedUser,
    tutorId: string,
    documentId: string,
    dto: VerifyVerificationDocumentDto,
  ) {
    return this.verification.verifyDocument(reviewer, tutorId, documentId, dto);
  }
  assignVerificationLevel(
    reviewer: AuthenticatedUser,
    tutorId: string,
    level: TutorVerificationLevel,
    reviewerUserId?: string,
  ) {
    return this.verification.assignLevel(reviewer, tutorId, level, reviewerUserId);
  }
  getVerificationDocumentAccess(reviewer: AuthenticatedUser, tutorId: string, documentId: string) {
    return this.verification.getDocumentAccess(reviewer, tutorId, documentId);
  }
  runVerificationExpirySweep() {
    if (!this.expiry) {
      throw new BadRequestException('Verification expiry maintenance is not available.');
    }
    return this.expiry.sweep();
  }

  private requireDossier(): TutorDossierService {
    if (!this.dossier) {
      throw new BadRequestException('Verification dossier endpoints are not available.');
    }
    return this.dossier;
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
