import crypto from 'node:crypto';
import { BadRequestException } from '@nestjs/common';

/**
 * Money helpers for Bangladeshi Taka.
 *
 * All persisted amounts are integer minor units (poisha). This module never
 * uses IEEE-754 floats for arithmetic; the only decimal conversion happens when
 * a human enters an amount or when an amount is rendered.
 */

/** Parse a persisted/DB minor-unit value into bigint, rejecting fractions. */
export function parseMinor(value: string | number | bigint): bigint {
  if (typeof value === 'bigint') {
    if (value < 0n) throw new BadRequestException('Money amount cannot be negative');
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value < 0) {
      throw new BadRequestException('Money amount must be a non-negative integer in poisha');
    }
    return BigInt(value);
  }
  if (!/^\d+$/.test(value.trim())) {
    throw new BadRequestException('Money amount must be a non-negative integer in poisha');
  }
  return BigInt(value.trim());
}

/** Parse a user-entered BDT decimal (e.g. "1200.50") into poisha. */
export function bdtToMinor(value: string): bigint {
  const normalized = value.trim();
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) {
    throw new BadRequestException('Amount must be a BDT value with at most two decimal places');
  }
  const whole = BigInt(match[1]);
  const fraction = BigInt((match[2] ?? '').padEnd(2, '0'));
  return whole * 100n + fraction;
}

/** Render minor units as a fixed two-decimal BDT string (no grouping). */
export function minorToBdtString(minor: bigint | string | number): string {
  const value = typeof minor === 'bigint' ? minor : BigInt(minor);
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const whole = absolute / 100n;
  const fraction = (absolute % 100n).toString().padStart(2, '0');
  return `${negative ? '-' : ''}${whole.toString()}.${fraction}`;
}

/**
 * Split a gross amount into platform commission and tutor net.
 *
 * Rounding policy: commission is floored to the poisha and the remaining
 * poisha go to the tutor. `fee + net === gross` always holds, even for amounts
 * that do not divide cleanly by the basis-point denominator.
 */
export function splitCommission(
  grossMinor: bigint | string | number,
  rateBps: number,
): { platformFeeMinor: bigint; tutorNetMinor: bigint } {
  const gross = typeof grossMinor === 'bigint' ? grossMinor : parseMinor(grossMinor);
  if (gross <= 0n) {
    throw new BadRequestException('Settlement gross amount must be positive');
  }
  if (!Number.isInteger(rateBps) || rateBps < 0 || rateBps > 10000) {
    throw new BadRequestException('Commission rate must be an integer between 0 and 10000 bps');
  }
  const fee = (gross * BigInt(rateBps)) / 10000n;
  return { platformFeeMinor: fee, tutorNetMinor: gross - fee };
}

/** Apply a basis-point percentage, flooring to the poisha. */
export function applyBps(amountMinor: bigint, rateBps: number): bigint {
  if (!Number.isInteger(rateBps) || rateBps < 0 || rateBps > 10000) {
    throw new BadRequestException('Rate must be an integer between 0 and 10000 bps');
  }
  return (amountMinor * BigInt(rateBps)) / 10000n;
}

/** Mask a payout account for display and storage (keep the last four chars). */
export function maskAccountReference(value: string): string {
  const compact = value.replace(/\s+/g, '');
  if (compact.length <= 4) return '*'.repeat(compact.length);
  return `${'*'.repeat(Math.max(0, compact.length - 4))}${compact.slice(-4)}`;
}

/** Stable hash so duplicate payout destinations can be detected without storing PII. */
export function hashAccountReference(value: string): string {
  const normalized = value.replace(/\s+/g, '').toLowerCase();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/** Format a non-negative integer with thousands separators (ASCII digits). */
export function formatMinorAsGroupedBdt(minor: bigint): string {
  const text = minorToBdtString(minor);
  const [whole, fraction] = text.split('.');
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction}`;
}
