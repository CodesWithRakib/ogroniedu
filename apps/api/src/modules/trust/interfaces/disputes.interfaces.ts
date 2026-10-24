import type { BookingDisputeEntity } from '../entities';

export interface DisputeListResponse {
  data: BookingDisputeEntity[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
