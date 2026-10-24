import type { BookingSessionSeriesEntity } from '../entities/booking-session-series.entity';
import type { BookingSessionEntity } from '../entities/booking-session.entity';

export interface SeriesMutationResult {
  series: BookingSessionSeriesEntity;
  sessions: BookingSessionEntity[];
}
