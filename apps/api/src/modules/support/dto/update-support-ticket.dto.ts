import { IsIn, IsOptional, IsString, Length } from 'class-validator';
import { SUPPORT_TICKET_STATUSES } from '../enums/support-ticket-status.enum';

export class UpdateSupportTicketDto {
  @IsIn([...SUPPORT_TICKET_STATUSES])
  status!: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  resolutionNotes?: string;
}
