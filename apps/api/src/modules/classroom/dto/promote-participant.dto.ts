import { IsString, IsNotEmpty, IsBoolean } from 'class-validator';

export class PromoteParticipantDto {
  @IsString()
  @IsNotEmpty()
  participantIdentity!: string;

  @IsBoolean()
  canPublish!: boolean;
}
