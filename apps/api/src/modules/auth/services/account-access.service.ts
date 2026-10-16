import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';

/** Minimal trusted server-side account state used for token invalidation. */
export interface AccountAccessSnapshot {
  id: string;
  status: string;
  authEpoch: number;
}

/**
 * Authoritative read of the account row behind an access token.
 *
 * The JWT is only a carrier of claims; authorization decisions must not rely on
 * the token alone. This service lets the authentication guard verify, on every
 * request, that the account still exists, is not suspended/deactivated, and has
 * not had its credential epoch bumped (password change / forced revocation).
 */
@Injectable()
export class AccountAccessService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getSnapshot(userId: string): Promise<AccountAccessSnapshot | null> {
    const rows: Array<{ id: string; status: string; auth_epoch: number | string }> =
      await this.dataSource.query(
        `SELECT id, status, COALESCE(auth_epoch, 0) AS auth_epoch
         FROM users
         WHERE id = $1 AND deleted_at IS NULL
         LIMIT 1;`,
        [userId],
      );

    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      id: row.id,
      status: row.status,
      authEpoch: Number(row.auth_epoch) || 0,
    };
  }
}

/** Account statuses that must never be able to use an existing session. */
export const BLOCKED_ACCOUNT_STATUSES: readonly string[] = [
  'suspended',
  'deactivated',
  'deletion_pending',
];

/** True when the account state must invalidate the presented access token. */
export function isAccountAccessBlocked(status: string): boolean {
  return BLOCKED_ACCOUNT_STATUSES.includes(status);
}
