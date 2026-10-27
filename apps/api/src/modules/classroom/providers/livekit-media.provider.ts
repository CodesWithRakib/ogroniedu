import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken, RoomServiceClient, WebhookReceiver } from 'livekit-server-sdk';
import type {
  IMediaProvider,
  MediaTokenOptions,
  ParticipantPermissionUpdate,
  LiveKitWebhookPayload,
} from '../interfaces/media-provider.interface';

@Injectable()
export class LiveKitMediaProvider implements IMediaProvider {
  private readonly logger = new Logger(LiveKitMediaProvider.name);
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly livekitUrl: string;
  private readonly httpUrl: string;
  private readonly roomService: RoomServiceClient;
  private readonly webhookReceiver: WebhookReceiver;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('LIVEKIT_API_KEY') || 'APIbhJrhxN8HYWZ';
    this.apiSecret =
      this.config.get<string>('LIVEKIT_API_SECRET') ||
      'upAkeQfyEx6OjsV1Ohlj5Iz4O2gIOQHlCez2CZb6Dh2A';
    this.livekitUrl =
      this.config.get<string>('LIVEKIT_URL') || 'wss://ogroniedu-57i4qo5d.livekit.cloud';

    this.httpUrl = this.livekitUrl
      .replace(/^wss:\/\//i, 'https://')
      .replace(/^ws:\/\//i, 'http://');

    this.roomService = new RoomServiceClient(this.httpUrl, this.apiKey, this.apiSecret);
    this.webhookReceiver = new WebhookReceiver(this.apiKey, this.apiSecret);

    this.logger.log(`LiveKit Media Provider initialized against endpoint: ${this.httpUrl}`);
  }

  async generateAccessToken(options: MediaTokenOptions): Promise<string> {
    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity: options.participantIdentity,
      name: options.participantName,
      ttl: options.ttlSeconds || 4 * 3600,
      metadata: options.metadata ? JSON.stringify(options.metadata) : undefined,
    });

    at.addGrant({
      roomJoin: true,
      room: options.roomName,
      canPublish: options.canPublish,
      canSubscribe: options.canSubscribe,
      canPublishData: options.canPublishData,
      roomAdmin: options.isHost,
    });

    return at.toJwt();
  }

  async updateParticipantPermissions(
    roomName: string,
    identity: string,
    permissions: ParticipantPermissionUpdate,
  ): Promise<void> {
    try {
      await this.roomService.updateParticipant(roomName, identity, undefined, {
        canPublish: permissions.canPublish,
        canSubscribe: permissions.canSubscribe,
        canPublishData: permissions.canPublishData,
      });
      this.logger.log(
        `Updated permissions for participant ${identity} in room ${roomName}: canPublish=${permissions.canPublish}`,
      );
    } catch (err: unknown) {
      this.logger.error(
        `Failed to update participant permissions in LiveKit for ${identity} in ${roomName}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }

  async muteParticipantTrack(
    roomName: string,
    identity: string,
    trackSid: string,
    muted: boolean,
  ): Promise<void> {
    try {
      await this.roomService.mutePublishedTrack(roomName, identity, trackSid, muted);
      this.logger.log(`Muted track ${trackSid} for participant ${identity} in room ${roomName}`);
    } catch (err: unknown) {
      this.logger.error(
        `Failed to mute track in LiveKit: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }

  async removeParticipant(roomName: string, identity: string): Promise<void> {
    try {
      await this.roomService.removeParticipant(roomName, identity);
      this.logger.log(`Participant ${identity} removed from room ${roomName}`);
    } catch (err: unknown) {
      this.logger.error(
        `Failed to remove participant from LiveKit room: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }

  async endRoom(roomName: string): Promise<void> {
    try {
      await this.roomService.deleteRoom(roomName);
      this.logger.log(`LiveKit room deleted: ${roomName}`);
    } catch (err: unknown) {
      this.logger.warn(
        `Failed or room already deleted in LiveKit: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async verifyWebhook(
    rawBody: string | Buffer,
    authHeader: string,
  ): Promise<LiveKitWebhookPayload> {
    try {
      const bodyString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
      const event = await this.webhookReceiver.receive(bodyString, authHeader);
      return event as unknown as LiveKitWebhookPayload;
    } catch (err: unknown) {
      this.logger.warn(
        `LiveKit webhook signature verification failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }
}
