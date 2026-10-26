export interface MediaTokenOptions {
  roomName: string;
  participantIdentity: string;
  participantName: string;
  isHost: boolean;
  canPublish: boolean;
  canSubscribe: boolean;
  canPublishData: boolean;
  metadata?: Record<string, unknown>;
  ttlSeconds?: number;
}

export interface ParticipantPermissionUpdate {
  canPublish?: boolean;
  canSubscribe?: boolean;
  canPublishData?: boolean;
}

export interface LiveKitWebhookPayload {
  event: string;
  id?: string;
  createdAt?: number;
  room?: {
    sid?: string;
    name?: string;
    emptyTimeout?: number;
    maxParticipants?: number;
    creationTime?: number;
    metadata?: string;
    numParticipants?: number;
  };
  participant?: {
    sid?: string;
    identity?: string;
    name?: string;
    state?: number;
    joinedAt?: number;
    metadata?: string;
  };
  track?: {
    sid?: string;
    type?: number;
    source?: number;
    mimeType?: string;
    muted?: boolean;
    width?: number;
    height?: number;
  };
}

export interface IMediaProvider {
  generateAccessToken(options: MediaTokenOptions): Promise<string>;
  updateParticipantPermissions(
    roomName: string,
    identity: string,
    permissions: ParticipantPermissionUpdate,
  ): Promise<void>;
  muteParticipantTrack(
    roomName: string,
    identity: string,
    trackSid: string,
    muted: boolean,
  ): Promise<void>;
  removeParticipant(roomName: string, identity: string): Promise<void>;
  endRoom(roomName: string): Promise<void>;
  verifyWebhook(rawBody: string | Buffer, authHeader: string): Promise<LiveKitWebhookPayload>;
}
