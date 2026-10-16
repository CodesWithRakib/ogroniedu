import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OnboardingService } from '../src/modules/onboarding/onboarding.service';
import {
  getOnboardingDefinition,
  resolveOnboardingRole,
} from '../src/modules/onboarding/onboarding.config';

interface QueryRoute {
  match: string;
  result: unknown[] | ((params: unknown[]) => unknown[]);
}

function createDataSource(routes: QueryRoute[]) {
  return {
    query: vi.fn(async (sql: string, params: unknown[] = []) => {
      for (const route of routes) {
        if (sql.includes(route.match)) {
          return typeof route.result === 'function' ? route.result(params) : route.result;
        }
      }
      return [];
    }),
  };
}

const ROLES_QUERY = 'FROM user_roles';
const ONBOARDING_SELECT = 'FROM user_onboarding';
const USERS_CONTACT = 'email_verified_at, phone_verified_at FROM users';
const GUARDIAN_LINK = 'FROM guardian_student_links';
const TUTOR_VERIFICATION = 'FROM tutor_profiles';

function persistRoute(): QueryRoute {
  return {
    match: 'INSERT INTO user_onboarding',
    result: (params) => [
      {
        role_code: params[1],
        status: params[2],
        completed_steps: params[3],
        pending_steps: params[4],
        step_data: JSON.parse(String(params[5])),
        completed_at: params[2] === 'completed' ? new Date() : null,
        updated_at: new Date(),
      },
    ],
  };
}

function baseRoutes(role: string, options: { row?: unknown[]; tutorStatus?: string | null } = {}) {
  return createDataSource([
    { match: ROLES_QUERY, result: [{ code: role }] },
    { match: ONBOARDING_SELECT, result: options.row ?? [] },
    { match: USERS_CONTACT, result: [{ email_verified_at: null, phone_verified_at: null }] },
    { match: GUARDIAN_LINK, result: [] },
    {
      match: TUTOR_VERIFICATION,
      result: options.tutorStatus ? [{ verification_status: options.tutorStatus }] : [],
    },
    persistRoute(),
  ]);
}

describe('onboarding configuration', () => {
  it('defines a step track for all nine roles', () => {
    for (const role of [
      'student',
      'guardian',
      'tutor',
      'admin',
      'super_admin',
      'support_agent',
      'compliance_reviewer',
      'organization_owner',
      'organization_staff',
    ]) {
      expect(getOnboardingDefinition(role)?.steps.length).toBeGreaterThan(0);
    }
  });

  it('resolves the most constrained role track for multi-role users', () => {
    expect(resolveOnboardingRole(['student'])).toBe('student');
    expect(resolveOnboardingRole(['student', 'guardian'])).toBe('guardian');
    expect(resolveOnboardingRole(['tutor', 'admin'])).toBe('admin');
    expect(resolveOnboardingRole(['guardian', 'super_admin'])).toBe('super_admin');
    expect(resolveOnboardingRole([])).toBeNull();
  });
});

describe('OnboardingService', () => {
  let service: OnboardingService;

  beforeEach(() => {
    service = new OnboardingService(baseRoutes('student') as never);
  });

  it('derives status from trusted server records (no user input)', async () => {
    const status = await service.getStatus('user-1');
    expect(status.role).toBe('student');
    expect(status.status).toBe('not_started');
    expect(status.isComplete).toBe(false);
    expect(status.steps.map((step) => step.key)).toEqual([
      'contact_verification',
      'profile',
      'learning_preferences',
    ]);
    expect(status.nextStep).toBe('profile');
  });

  it('marks the contact step complete only when a trusted verified timestamp exists', async () => {
    const dataSource = createDataSource([
      { match: ROLES_QUERY, result: [{ code: 'student' }] },
      { match: ONBOARDING_SELECT, result: [] },
      {
        match: USERS_CONTACT,
        result: [{ email_verified_at: new Date(), phone_verified_at: null }],
      },
    ]);
    const local = new OnboardingService(dataSource as never);
    const status = await local.getStatus('user-1');
    expect(status.steps[0].status).toBe('completed');
  });

  it('rejects a payload that fails the step validator', async () => {
    await expect(
      service.completeStep('user-1', 'profile', { institutionName: 'x' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('NEGATIVE: rejects a system-verified step that the user may not submit', async () => {
    const guardianService = new OnboardingService(baseRoutes('guardian') as never);
    await expect(guardianService.completeStep('user-1', 'link_student', {})).rejects.toThrow(
      BadRequestException,
    );
  });

  it('NEGATIVE: rejects a step that does not belong to the role track', async () => {
    await expect(service.completeStep('user-1', 'security_setup', {})).rejects.toThrow(
      NotFoundException,
    );
  });

  it('records a valid step and advances nextStep', async () => {
    const status = await service.completeStep('user-1', 'profile', {
      institutionName: 'Dhaka College',
    });
    expect(status.completedSteps).toEqual(['profile']);
    expect(status.isComplete).toBe(false);
    expect(status.nextStep).toBe('learning_preferences');
  });

  it('completes the track when every required step is satisfied', async () => {
    const dataSource = createDataSource([
      { match: ROLES_QUERY, result: [{ code: 'student' }] },
      {
        match: ONBOARDING_SELECT,
        result: [
          {
            role_code: 'student',
            status: 'in_progress',
            completed_steps: ['profile'],
            pending_steps: [],
            step_data: {},
            completed_at: null,
            updated_at: new Date(),
          },
        ],
      },
      {
        match: USERS_CONTACT,
        result: [{ email_verified_at: new Date(), phone_verified_at: null }],
      },
      persistRoute(),
    ]);
    const local = new OnboardingService(dataSource as never);
    const status = await local.completeStep('user-1', 'learning_preferences', {
      preferredLocale: 'bn',
    });
    expect(status.status).toBe('completed');
    expect(status.isComplete).toBe(true);
  });

  it('moves an approval-gated step to pending_review rather than completing it', async () => {
    const dataSource = baseRoutes('tutor', { tutorStatus: 'not_submitted' });
    const local = new OnboardingService(dataSource as never);
    const status = await local.completeStep('user-1', 'documents', {
      documents: [{ fileAssetId: 'file-asset-1', documentType: 'nid' }],
    });
    expect(status.pendingSteps).toEqual(['documents']);
    expect(status.status).toBe('pending_review');
    expect(status.requiresApproval).toBe(true);
    expect(status.isComplete).toBe(false);
  });

  it('never marks a tutor verified from onboarding alone', async () => {
    const dataSource = baseRoutes('tutor', { tutorStatus: 'under_review' });
    const local = new OnboardingService(dataSource as never);
    const status = await local.getStatus('user-1');
    const verification = status.steps.find((step) => step.key === 'verification');
    expect(verification?.status).toBe('pending_review');
    expect(status.isComplete).toBe(false);
    expect(status.verificationStatus).toBe('under_review');
  });

  it('requires the security acknowledgement for privileged role tracks', async () => {
    const dataSource = baseRoutes('super_admin');
    const local = new OnboardingService(dataSource as never);
    await expect(
      local.completeStep('user-1', 'security_setup', { acknowledgePolicy: false }),
    ).rejects.toThrow(/acknowledge the platform security policy/i);
    const done = await local.completeStep('user-1', 'security_setup', { acknowledgePolicy: true });
    expect(done.isComplete).toBe(true);
  });

  it('returns a not_started empty track when the user has no roles', async () => {
    const dataSource = createDataSource([{ match: ROLES_QUERY, result: [] }]);
    const local = new OnboardingService(dataSource as never);
    const status = await local.getStatus('user-1');
    expect(status.role).toBeNull();
    expect(status.status).toBe('not_started');
    expect(status.steps).toEqual([]);
  });
});
