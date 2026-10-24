import type { Repository } from 'typeorm';
import type {
  TutorReplacementCaseEntity,
  TutorReplacementCaseEventEntity,
} from '../entities';
import type { BookingEntity } from '../../bookings/entities/booking.entity';
import type { OutboxEventEntity } from '../../bookings/entities/outbox-event.entity';
import type { AuditLogEntity } from '../../audit/entities/audit-log.entity';
import type { ReplacementCaseView } from './replacement-case-view.interface';

export interface ReplacementRepos {
  caseRepo: Repository<TutorReplacementCaseEntity>;
  bookingRepo: Repository<BookingEntity>;
  outboxRepo: Repository<OutboxEventEntity>;
  auditRepo: Repository<AuditLogEntity>;
  eventRepo: Repository<TutorReplacementCaseEventEntity>;
}

export interface ReplacementListResponse {
  data: ReplacementCaseView[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
