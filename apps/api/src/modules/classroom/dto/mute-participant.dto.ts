import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class MuteParticipantDto {
  @IsString()
  @IsNotEmpty()
  participantIdentity!: string;

  @IsOptional()
  @IsString()
  trackSid?: string;

  @IsOptional()
  @IsBoolean()
  muted: boolean = true;
}
