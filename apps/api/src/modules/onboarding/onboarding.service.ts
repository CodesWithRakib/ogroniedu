import type { OnboardingRow, SystemStepContext } from './interfaces/onboarding.interfaces';
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Inject,
  Optional,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { AuditService } from '../audit/audit.service';
import {
  getOnboardingDefinition,
  resolveOnboardingRole,
  type OnboardingStepDefinition,
} from './onboarding.config';
import { validateOnboardingPayload } from './onboarding-validators';
import type {
  OnboardingStatus,
  OnboardingStepState,
  OnboardingStepStatus,
  OnboardingTrackStatus,
} from './interfaces/onboarding-status.interface';

const TRACK_NOT_STARTED: OnboardingTrackStatus = 'not_started';
const TRACK_IN_PROGRESS: OnboardingTrackStatus = 'in_progress';
const TRACK_PENDING_REVIEW: OnboardingTrackStatus = 'pending_review';
const TRACK_COMPLETED: OnboardingTrackStatus = 'completed';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Optional() @Inject(AuditService) private readonly audit?: AuditService,
  ) {}

  /** Authoritative onboarding state for the user's most-privileged role. */
  async getStatus(userId: string): Promise<OnboardingStatus> {
    const roles = await this.fetchRoles(userId);
    const role = resolveOnboardingRole(roles);

    if (!role) {
      return this.emptyStatus(null);
    }

    const definition = getOnboardingDefinition(role);
    if (!definition) {
      return this.emptyStatus(role);
    }

    const [row, context] = await Promise.all([
      this.fetchOnboardingRow(userId, role),
      this.fetchSystemStepContext(userId, role),
    ]);

    return this.deriveStatus(definition, row, context);
  }

  /**
   * Complete (or submit) a single onboarding step.
   *
   * The step must belong to the caller's own role track; approval-gated steps
   * that are not user-submittable can only be advanced by the reviewing system,
   * never by the user.
   */
  async completeStep(userId: string, stepKey: string, payload: unknown): Promise<OnboardingStatus> {
    const roles = await this.fetchRoles(userId);
    const role = resolveOnboardingRole(roles);
    if (!role) {
      throw new ForbiddenException('No onboarding track is available for this account');
    }

    const definition = getOnboardingDefinition(role);
    const step = definition?.steps.find((candidate) => candidate.key === stepKey);
    if (!definition || !step) {
      throw new NotFoundException(`Unknown onboarding step '${stepKey}' for role '${role}'`);
    }

    if (!step.submittable) {
      throw new BadRequestException(
        `Step '${stepKey}' cannot be completed directly; it is advanced by the platform.`,
      );
    }

    const validationError = validateOnboardingPayload(step.validator, payload);
    if (validationError) {
      throw new BadRequestException(`Invalid ${stepKey} payload: ${validationError}`);
    }

    const row = await this.fetchOnboardingRow(userId, role);
    const completedSteps = new Set(row?.completed_steps ?? []);
    const pendingSteps = new Set(row?.pending_steps ?? []);
    const stepData: Record<string, unknown> = { ...row?.step_data };

    stepData[stepKey] = payload ?? {};

    if (step.approvalGated) {
      pendingSteps.add(stepKey);
      completedSteps.delete(stepKey);
    } else {
      completedSteps.add(stepKey);
      pendingSteps.delete(stepKey);
    }

    if (role === 'tutor' && payload && typeof payload === 'object') {
      const rec = payload as Record<string, unknown>;

      // 1. Profile Step: Persist directly into tutor_profiles
      if (stepKey === 'profile') {
        try {
          const headlineEn = String(rec.headlineEn || rec.headline || '').trim();
          const headlineBn = String(rec.headlineBn || '').trim();
          const bioEn = String(rec.bioEn || rec.bio || '').trim();
          const bioBn = String(rec.bioBn || '').trim();
          const years = rec.yearsExperience ? Number(rec.yearsExperience) : null;
          const rawModes = Array.isArray(rec.teachingModes) ? rec.teachingModes : ['online'];
          const mappedModes: string[] = [];
          for (const m of rawModes) {
            if (m === 'student_home' || m === 'tutor_home' || m === 'in_person') {
              mappedModes.push('in_person');
            } else if (m === 'online') {
              mappedModes.push('online');
            } else if (m === 'hybrid') {
              mappedModes.push('hybrid');
            }
          }
          const modes = [...new Set(mappedModes)];
          const finalModes = modes.length > 0 ? modes : ['online'];
          const rateMinor = rec.hourlyRateMinor
            ? Number(rec.hourlyRateMinor)
            : rec.hourlyRate
              ? Math.round(Number(rec.hourlyRate) * 100)
              : null;

          await this.dataSource.query(
            `INSERT INTO tutor_profiles (
              user_id, headline, headline_en, headline_bn, bio, bio_en, bio_bn,
              years_experience, teaching_modes, hourly_rate_minor, currency, verification_status, publication_status, safety_hold_status, created_at, updated_at
            )
            VALUES (
              $1, $2, $2, $3, $4, $4, $5,
              $6, $7, $8, 'BDT', 'not_submitted', 'draft', 'clear', NOW(), NOW()
            )
            ON CONFLICT (user_id) DO UPDATE SET
              headline = EXCLUDED.headline,
              headline_en = EXCLUDED.headline_en,
              headline_bn = EXCLUDED.headline_bn,
              bio = EXCLUDED.bio,
              bio_en = EXCLUDED.bio_en,
              bio_bn = EXCLUDED.bio_bn,
              years_experience = EXCLUDED.years_experience,
              teaching_modes = EXCLUDED.teaching_modes,
              hourly_rate_minor = EXCLUDED.hourly_rate_minor,
              updated_at = NOW();`,
            [userId, headlineEn, headlineBn, bioEn, bioBn, years, finalModes, rateMinor],
          );

          if (this.audit) {
            await this.audit.record({
              actorUserId: userId,
              action: 'tutor.onboarding.profile_persisted',
              resourceType: 'tutor_profile',
              resourceId: userId,
              safeMetadata: { headlineEn, headlineBn, years, rateMinor },
            });
          }
        } catch (profileErr) {
          this.logger.error(`Failed to persist tutor profile during onboarding: ${profileErr}`);
        }
      }

      // 2. Education Step: Persist into tutor_qualifications
      if (stepKey === 'education') {
        try {
          const qualificationsList = Array.isArray(rec.qualifications) ? rec.qualifications : [rec];

          for (const item of qualificationsList) {
            const row = item as Record<string, unknown>;
            const degreeTitle = String(row.degree || row.title || '').trim();
            const qualType = String(row.type || row.qualificationType || 'degree').trim();
            const institution = String(row.institution || '').trim();
            const year =
              row.passingYear || row.year || row.issuedYear
                ? Number(row.passingYear || row.year || row.issuedYear)
                : null;

            if (degreeTitle) {
              await this.dataSource.query(
                `INSERT INTO tutor_qualifications (
                  id, tutor_user_id, qualification_type, title, title_en, title_bn,
                  institution, institution_en, institution_bn, issued_year, review_status, created_at
                )
                VALUES (
                  gen_random_uuid(), $1, $2, $3, $3, $3,
                  $4, $4, $4, $5, 'pending', NOW()
                );`,
                [userId, qualType, degreeTitle, institution, year],
              );
            }
          }

          if (this.audit) {
            await this.audit.record({
              actorUserId: userId,
              action: 'tutor.onboarding.education_persisted',
              resourceType: 'tutor_qualification',
              resourceId: userId,
              safeMetadata: { qualificationCount: qualificationsList.length },
            });
          }
        } catch (eduErr) {
          this.logger.error(`Failed to persist tutor education during onboarding: ${eduErr}`);
        }
      }

      // 3. Subjects Step: Persist into tutor_subjects
      if (stepKey === 'subjects') {
        try {
          const subjects = Array.isArray(rec.subjects)
            ? rec.subjects
            : rec.subjectId && rec.educationLevelId
              ? [rec]
              : [];

          for (const s of subjects) {
            const subjectId = String(s.subjectId);
            const levelId = String(s.educationLevelId);
            const rateMinor = s.hourlyRateMinor
              ? Number(s.hourlyRateMinor)
              : s.rateMinor
                ? Number(s.rateMinor)
                : s.rate
                  ? Math.round(Number(s.rate) * 100)
                  : null;

            await this.dataSource.query(
              `INSERT INTO tutor_subjects (
                id, tutor_user_id, subject_id, education_level_id, rate_minor, currency, created_at
              )
              VALUES (gen_random_uuid(), $1, $2, $3, $4, 'BDT', NOW())
              ON CONFLICT DO NOTHING;`,
              [userId, subjectId, levelId, rateMinor],
            );
          }

          if (this.audit) {
            await this.audit.record({
              actorUserId: userId,
              action: 'tutor.onboarding.subjects_persisted',
              resourceType: 'tutor_subject',
              resourceId: userId,
              safeMetadata: { subjectCount: subjects.length },
            });
          }
        } catch (subErr) {
          this.logger.error(`Failed to persist tutor subjects during onboarding: ${subErr}`);
        }
      }

      // 4. Availability Step: Persist into tutor_availability
      if (stepKey === 'availability') {
        try {
          const slots = Array.isArray(rec.slots) ? rec.slots : [];
          if (slots.length > 0) {
            await this.dataSource.query(
              `DELETE FROM tutor_availability WHERE tutor_user_id = $1;`,
              [userId],
            );

            for (const slot of slots) {
              await this.dataSource.query(
                `INSERT INTO tutor_availability (
                  id, tutor_user_id, weekday, start_local, end_local, timezone, is_active
                )
                VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, true);`,
                [
                  userId,
                  Number(slot.weekday),
                  String(slot.startLocal),
                  String(slot.endLocal),
                  String(slot.timezone || 'Asia/Dhaka'),
                ],
              );
            }

            if (this.audit) {
              await this.audit.record({
                actorUserId: userId,
                action: 'tutor.onboarding.availability_persisted',
                resourceType: 'tutor_availability',
                resourceId: userId,
                safeMetadata: { slotCount: slots.length },
              });
            }
          }
        } catch (availErr) {
          this.logger.error(`Failed to persist tutor availability during onboarding: ${availErr}`);
        }
      }

      // 5. Documents Step: Link to tutor_verification_documents & tutor_verification_levels
      if (stepKey === 'documents') {
        try {
          const docs: Array<{ fileAssetId: string; documentType: string; level?: string }> = [];
          if (Array.isArray(rec.documents)) {
            docs.push(...rec.documents);
          } else if (rec.fileAssetId) {
            docs.push({
              fileAssetId: String(rec.fileAssetId),
              documentType: String(rec.documentType || 'nid'),
            });
          }

          const affectedLevels = new Set<string>();

          for (const doc of docs) {
            let docType = doc.documentType;
            let level = doc.level;

            if (docType === 'nid_back') {
              docType = 'nid_back';
              level = 'identity';
            } else if (docType === 'nid' || docType === 'nid_front') {
              docType = 'nid_front';
              level = 'identity';
            } else if (docType === 'degree' || docType === 'academic_certificate') {
              docType = 'academic_certificate';
              level = 'educational';
            } else if (docType === 'transcript') {
              docType = 'transcript';
              level = 'educational';
            } else if (docType === 'experience' || docType === 'professional_certificate') {
              docType = 'professional_certificate';
              level = 'institutional';
            } else if (docType === 'institution_letter') {
              docType = 'institution_letter';
              level = 'institutional';
            } else if (docType === 'employment_letter') {
              docType = 'employment_letter';
              level = 'institutional';
            } else {
              docType = 'other_supporting';
              level = level || 'institutional';
            }

            affectedLevels.add(level);

            await this.dataSource.query(
              `INSERT INTO tutor_verification_documents (
                id, tutor_user_id, level, document_type, file_asset_id, review_status, created_at, updated_at
              )
              VALUES (gen_random_uuid(), $1, $2, $3, $4, 'pending', NOW(), NOW());`,
              [userId, level, docType, doc.fileAssetId],
            );
          }

          for (const lvl of affectedLevels) {
            await this.dataSource.query(
              `INSERT INTO tutor_verification_levels (
                id, tutor_user_id, level, status, policy_version, submission_count, first_submitted_at, last_submitted_at, created_at, updated_at
              )
              VALUES (gen_random_uuid(), $1, $2, 'submitted', 'v1.0-bd-tutor-verification', 1, NOW(), NOW(), NOW(), NOW())
              ON CONFLICT (tutor_user_id, level) DO UPDATE
              SET status = 'submitted', last_submitted_at = NOW(), submission_count = tutor_verification_levels.submission_count + 1, updated_at = NOW();`,
              [userId, lvl],
            );
          }

          await this.dataSource.query(
            `UPDATE tutor_profiles SET verification_status = 'under_review', updated_at = NOW() WHERE user_id = $1;`,
            [userId],
          );

          if (this.audit) {
            await this.audit.record({
              actorUserId: userId,
              action: 'tutor.onboarding.documents_submitted',
              resourceType: 'tutor_verification_level',
              resourceId: userId,
              safeMetadata: { documentCount: docs.length, affectedLevels: [...affectedLevels] },
            });
          }
        } catch (docErr) {
          this.logger.error(
            `Failed to link onboarding documents to verification levels: ${docErr}`,
          );
        }
      }
    }

    const context = await this.fetchSystemStepContext(userId, role);
    const provisional = this.deriveStatus(
      definition,
      {
        role_code: role,
        status: row?.status ?? TRACK_IN_PROGRESS,
        completed_steps: [...completedSteps],
        pending_steps: [...pendingSteps],
        step_data: stepData,
        completed_at: null,
        updated_at: new Date(),
      },
      context,
    );

    const persisted = await this.persistProgress({
      userId,
      roleCode: role,
      status: provisional.status,
      completedSteps: [...completedSteps],
      pendingSteps: [...pendingSteps],
      stepData,
    });

    if (this.audit) {
      try {
        await this.audit.record({
          actorUserId: userId,
          action: 'auth.onboarding.step_completed',
          resourceType: 'user_onboarding',
          resourceId: userId,
          safeMetadata: {
            role,
            step: stepKey,
            approvalGated: step.approvalGated,
            trackStatus: provisional.status,
          },
        });
      } catch {
        // Audit failures must not block onboarding progress.
      }
    }

    return this.deriveStatus(
      definition,
      {
        role_code: role,
        status: persisted.status,
        completed_steps: persisted.completed_steps,
        pending_steps: persisted.pending_steps,
        step_data: persisted.step_data,
        completed_at: persisted.completed_at,
        updated_at: persisted.updated_at,
      },
      context,
    );
  }

  private async persistProgress(input: {
    userId: string;
    roleCode: string;
    status: string;
    completedSteps: string[];
    pendingSteps: string[];
    stepData: Record<string, unknown>;
  }): Promise<OnboardingRow> {
    const rows: OnboardingRow[] = await this.dataSource.query(
      `INSERT INTO user_onboarding
         (user_id, role_code, status, completed_steps, pending_steps, step_data, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, CASE WHEN $3 = 'completed' THEN now() ELSE NULL END)
       ON CONFLICT (user_id, role_code) DO UPDATE
         SET status = EXCLUDED.status,
             completed_steps = EXCLUDED.completed_steps,
             pending_steps = EXCLUDED.pending_steps,
             step_data = EXCLUDED.step_data,
             completed_at = CASE
               WHEN EXCLUDED.status = 'completed' THEN COALESCE(user_onboarding.completed_at, now())
               ELSE NULL
             END,
             updated_at = now()
       RETURNING role_code, status, completed_steps, pending_steps, step_data, completed_at, updated_at;`,
      [
        input.userId,
        input.roleCode,
        input.status,
        input.completedSteps,
        input.pendingSteps,
        JSON.stringify(input.stepData),
      ],
    );
    return rows[0];
  }

  private async fetchRoles(userId: string): Promise<string[]> {
    const rows: Array<{ code: string }> = await this.dataSource.query(
      `SELECT r.code
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = $1 AND ur.revoked_at IS NULL;`,
      [userId],
    );
    return rows.map((row) => row.code);
  }

  private async fetchOnboardingRow(userId: string, role: string): Promise<OnboardingRow | null> {
    const rows: OnboardingRow[] = await this.dataSource.query(
      `SELECT role_code, status, completed_steps, pending_steps, step_data, completed_at, updated_at
       FROM user_onboarding
       WHERE user_id = $1 AND role_code = $2
       LIMIT 1;`,
      [userId, role],
    );
    return rows.length > 0 ? rows[0] : null;
  }

  private async fetchSystemStepContext(userId: string, role: string): Promise<SystemStepContext> {
    const needsContact = true;
    const needsGuardianLink = role === 'guardian';
    const needsTutorVerification = role === 'tutor';

    const [userRows, linkRows, tutorRows] = await Promise.all([
      needsContact
        ? this.dataSource.query(
            `SELECT email_verified_at, phone_verified_at FROM users WHERE id = $1 LIMIT 1;`,
            [userId],
          )
        : Promise.resolve([]),
      needsGuardianLink
        ? this.dataSource.query(
            `SELECT 1 FROM guardian_student_links
             WHERE guardian_user_id = $1 AND status = 'active' LIMIT 1;`,
            [userId],
          )
        : Promise.resolve([]),
      needsTutorVerification
        ? this.dataSource.query(
            `SELECT verification_status FROM tutor_profiles WHERE user_id = $1 LIMIT 1;`,
            [userId],
          )
        : Promise.resolve([]),
    ]);

    const user = userRows[0] as
      { email_verified_at: Date | null; phone_verified_at: Date | null } | undefined;

    return {
      hasVerifiedContact: Boolean(user?.email_verified_at || user?.phone_verified_at),
      hasActiveGuardianLink: linkRows.length > 0,
      tutorVerificationStatus:
        (tutorRows[0] as { verification_status?: string } | undefined)?.verification_status ?? null,
    };
  }

  private deriveStatus(
    definition: {
      role: string;
      labelEn: string;
      labelBn: string;
      steps: OnboardingStepDefinition[];
    },
    row: OnboardingRow | null,
    context: SystemStepContext,
  ): OnboardingStatus {
    const completed = new Set(row?.completed_steps ?? []);
    const pending = new Set(row?.pending_steps ?? []);
    const steps: OnboardingStepStatus[] = [];
    let requiresApproval = false;

    for (const step of definition.steps) {
      const state = this.resolveStepState(step, completed, pending, context);
      if (
        step.required &&
        (state === 'pending_review' || (step.approvalGated && state === 'pending'))
      ) {
        requiresApproval = true;
      }
      steps.push({
        key: step.key,
        titleEn: step.titleEn,
        titleBn: step.titleBn,
        required: step.required,
        submittable: step.submittable,
        approvalGated: step.approvalGated,
        status: state,
      });
    }

    const requiredSteps = steps.filter((step) => step.required);
    const allRequiredCompleted =
      requiredSteps.length > 0 && requiredSteps.every((step) => step.status === 'completed');
    const anyRequiredInReview = requiredSteps.some((step) => step.status === 'pending_review');

    let status: OnboardingTrackStatus = TRACK_IN_PROGRESS;
    if (allRequiredCompleted) {
      status = TRACK_COMPLETED;
    } else if (anyRequiredInReview) {
      status = TRACK_PENDING_REVIEW;
    } else if (!row) {
      status = TRACK_NOT_STARTED;
    }

    const nextStep =
      steps.find((step) => step.required && step.status === 'pending' && step.submittable)?.key ??
      steps.find((step) => step.required && step.status === 'pending')?.key ??
      null;

    return {
      role: definition.role,
      roleLabelEn: definition.labelEn,
      roleLabelBn: definition.labelBn,
      status,
      isComplete: status === TRACK_COMPLETED,
      requiresApproval,
      completedSteps: [...completed],
      pendingSteps: [...pending],
      steps,
      nextStep,
      verificationStatus: context.tutorVerificationStatus,
      updatedAt: row?.updated_at ? new Date(row.updated_at).toISOString() : null,
    };
  }

  private resolveStepState(
    step: OnboardingStepDefinition,
    completed: Set<string>,
    pending: Set<string>,
    context: SystemStepContext,
  ): OnboardingStepState {
    if (step.systemVerified) {
      switch (step.key) {
        case 'contact_verification':
          return context.hasVerifiedContact ? 'completed' : 'pending';
        case 'link_student':
          return context.hasActiveGuardianLink ? 'completed' : 'pending';
        case 'verification': {
          const verification = context.tutorVerificationStatus;
          if (verification === 'approved') return 'completed';
          if (verification === 'submitted' || verification === 'under_review') {
            return 'pending_review';
          }
          return 'pending';
        }
        case 'ownership_verification':
          // Ownership verification is decided by the compliance workflow.
          return pending.has(step.key) ? 'pending_review' : 'pending';
        case 'membership':
          // Organization membership tables land in a later phase; until then the
          // step cannot be satisfied and is reported as pending (see report §12).
          return pending.has(step.key) ? 'pending_review' : 'pending';
        default:
          return completed.has(step.key) ? 'completed' : 'pending';
      }
    }

    if (completed.has(step.key)) return 'completed';
    if (pending.has(step.key)) return 'pending_review';
    return 'pending';
  }

  private emptyStatus(role: string | null): OnboardingStatus {
    return {
      role,
      roleLabelEn: null,
      roleLabelBn: null,
      status: TRACK_NOT_STARTED,
      isComplete: false,
      requiresApproval: false,
      completedSteps: [],
      pendingSteps: [],
      steps: [],
      nextStep: null,
      verificationStatus: null,
      updatedAt: null,
    };
  }
}
