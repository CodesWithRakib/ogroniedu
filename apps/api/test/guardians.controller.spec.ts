import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GuardiansController } from '../src/modules/guardians/guardians.controller';
import { GuardiansService } from '../src/modules/guardians/guardians.service';

describe('GuardiansController Unit Tests', () => {
  let controller: GuardiansController;
  let mockService: any;

  const mockUser = {
    id: 'guardian-uuid-1',
    roles: ['guardian'],
    email: 'guardian@example.com',
  };

  beforeEach(() => {
    mockService = {
      registerChild: vi.fn().mockResolvedValue({
        linkId: 'l1',
        studentId: 's1',
        displayName: 'Amina',
        status: 'active',
      }),
      linkChildRequest: vi.fn().mockResolvedValue({
        id: 'l2',
        status: 'pending',
      }),
      getLinkedChildren: vi
        .fn()
        .mockResolvedValue([
          { linkId: 'l1', studentId: 's1', displayName: 'Amina', status: 'active' },
        ]),
      getChildDetails: vi.fn().mockResolvedValue({
        linkId: 'l1',
        studentId: 's1',
        displayName: 'Amina',
        status: 'active',
      }),
      verifyLinkRequest: vi.fn().mockResolvedValue({
        id: 'l3',
        status: 'active',
      }),
      revokeLink: vi.fn().mockResolvedValue({
        success: true,
        message: 'Revoked',
      }),
    };

    controller = new GuardiansController(mockService as unknown as GuardiansService);
  });

  it('should register a new child learner under guardian', async () => {
    const dto = {
      displayName: 'Amina',
      relationshipType: 'mother' as const,
      consentPolicyVersion: 'v1.0-bd-minor-consent',
      consentAgreed: true,
    };

    const res = await controller.registerChild(mockUser, dto);
    expect(res.studentId).toBe('s1');
    expect(mockService.registerChild).toHaveBeenCalledWith(mockUser.id, dto);
  });

  it('should create a child link request', async () => {
    const dto = {
      studentIdentifier: 'student@example.com',
      relationshipType: 'father' as const,
      consentPolicyVersion: 'v1.0-bd-minor-consent',
      consentAgreed: true,
    };

    const res = await controller.linkChildRequest(mockUser, dto);
    expect(res.status).toBe('pending');
    expect(mockService.linkChildRequest).toHaveBeenCalledWith(mockUser.id, dto);
  });

  it('should list all linked children for guardian', async () => {
    const res = await controller.getLinkedChildren(mockUser);
    expect(res).toHaveLength(1);
    expect(mockService.getLinkedChildren).toHaveBeenCalledWith(mockUser.id);
  });

  it('should get child details for active relationship', async () => {
    const res = await controller.getChildDetails(mockUser, 's1');
    expect(res.studentId).toBe('s1');
    expect(mockService.getChildDetails).toHaveBeenCalledWith(mockUser.id, 's1');
  });

  it('should revoke relationship', async () => {
    const res = await controller.revokeLink(mockUser, 's1', { reason: 'No longer needed' });
    expect(res.success).toBe(true);
    expect(mockService.revokeLink).toHaveBeenCalledWith(mockUser.id, 's1', {
      reason: 'No longer needed',
    });
  });
});
