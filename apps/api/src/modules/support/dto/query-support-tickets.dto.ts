import { LimitOffsetQueryDto } from '../../../common/pagination/pagination.dto';
import { IsIn, IsOptional } from 'class-validator';
import { SUPPORT_TICKET_STATUSES } from '../enums/support-ticket-status.enum';

/** Staff ticket queue query: optional status filter + limit/offset paging. */
export class QuerySupportTicketsDto extends LimitOffsetQueryDto {
  @IsOptional()
  @IsIn([...SUPPORT_TICKET_STATUSES])
  status?: string;
}
