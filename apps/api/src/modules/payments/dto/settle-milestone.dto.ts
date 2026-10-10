import { IsUUID, IsNotEmpty } from 'class-validator';

export class SettleMilestoneDto {
  @IsUUID()
  @IsNotEmpty()
  sessionId!: string;
}
