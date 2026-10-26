import { z } from 'zod';

export const ClassroomModes = ['SMALL_GROUP', 'LARGE_BATCH'] as const;
export type ClassroomMode = (typeof ClassroomModes)[number];

export const ClassroomSessionStatuses = ['SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED'] as const;
export type ClassroomSessionStatus = (typeof ClassroomSessionStatuses)[number];

export const ClassroomRoles = ['HOST', 'CO_HOST', 'STUDENT', 'OBSERVER'] as const;
export type ClassroomRole = (typeof ClassroomRoles)[number];

export const JoinClassroomSchema = z.object({
  deviceInfo: z
    .object({
      browser: z.string().optional(),
      os: z.string().optional(),
      isMobile: z.boolean().optional(),
    })
    .optional(),
});
export type JoinClassroomInput = z.infer<typeof JoinClassroomSchema>;

export const RaiseHandSchema = z.object({
  isHandRaised: z.boolean(),
});
export type RaiseHandInput = z.infer<typeof RaiseHandSchema>;

export const PromoteParticipantSchema = z.object({
  participantIdentity: z.string().min(1),
  canPublish: z.boolean(),
});
export type PromoteParticipantInput = z.infer<typeof PromoteParticipantSchema>;

export const MuteParticipantSchema = z.object({
  participantIdentity: z.string().min(1),
  trackSid: z.string().optional(),
  muted: z.boolean().default(true),
});
export type MuteParticipantInput = z.infer<typeof MuteParticipantSchema>;

export const KickParticipantSchema = z.object({
  participantIdentity: z.string().min(1),
  reason: z.string().max(500).optional(),
});
export type KickParticipantInput = z.infer<typeof KickParticipantSchema>;

export const EndSessionSchema = z.object({
  notes: z.string().max(1000).optional(),
});
export type EndSessionInput = z.infer<typeof EndSessionSchema>;

export interface ClassroomJoinPayload {
  token: string;
  serverUrl: string;
  roomName: string;
  mode: ClassroomMode;
  role: ClassroomRole;
  canPublish: boolean;
  canSubscribe: boolean;
  canPublishData: boolean;
  participantIdentity: string;
  participantName: string;
  sessionId: string;
  bookingId?: string;
  subjectTitle?: string;
}

export interface ClassroomAttendeeSummary {
  id: string;
  userId: string;
  participantIdentity: string;
  participantName: string;
  role: ClassroomRole;
  firstJoinedAt: string | null;
  lastLeftAt: string | null;
  totalDurationSeconds: number;
  connectionStatus: 'CONNECTED' | 'DISCONNECTED';
  reconnectionCount: number;
  isHandRaised: boolean;
  handRaisedAt: string | null;
  isStagePromoted: boolean;
  stagePromotedAt: string | null;
}
