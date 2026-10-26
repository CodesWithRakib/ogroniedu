import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class KickParticipantDto {
  @IsString()
  @IsNotEmpty()
  participantIdentity!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
