import { describe, it, expect } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import {
  applyBps,
  bdtToMinor,
  formatMinorAsGroupedBdt,
  hashAccountReference,
  maskAccountReference,
  minorToBdtString,
  parseMinor,
  splitCommission,
} from '../src/common/money/money';

describe('Money utilities (integer poisha, no floating point)', () => {
  it('parses BDT decimals exactly', () => {
    expect(bdtToMinor('1200.50')).toBe(120050n);
    expect(bdtToMinor('0.05')).toBe(5n);
    expect(bdtToMinor('17')).toBe(1700n);
    expect(() => bdtToMinor('10.555')).toThrow(BadRequestException);
    expect(() => bdtToMinor('-1')).toThrow(BadRequestException);
  });

  it('renders minor units as fixed two-decimal BDT', () => {
    expect(minorToBdtString(100000)).toBe('1000.00');
    expect(minorToBdtString('5')).toBe('0.05');
    expect(minorToBdtString(0n)).toBe('0.00');
  });

  it('parses persisted minor values without accepting fractions', () => {
    expect(parseMinor('100000')).toBe(100000n);
    expect(parseMinor(100000)).toBe(100000n);
    expect(() => parseMinor(10.5)).toThrow(BadRequestException);
    expect(() => parseMinor('-10')).toThrow(BadRequestException);
    expect(() => parseMinor('1.5')).toThrow(BadRequestException);
  });

  it('floors commission and gives the remaining poisha to the tutor', () => {
    expect(splitCommission(100000, 800)).toEqual({
      platformFeeMinor: 8000n,
      tutorNetMinor: 92000n,
    });

    // 99 * 8% = 7.92 poisha → commission floors to 7, net keeps the remainder.
    const split = splitCommission(99, 800);
    expect(split.platformFeeMinor).toBe(7n);
    expect(split.tutorNetMinor).toBe(92n);
    expect(split.platformFeeMinor + split.tutorNetMinor).toBe(99n);
  });

  it('applies basis points with flooring', () => {
    expect(applyBps(100000n, 800)).toBe(8000n);
    expect(applyBps(99n, 800)).toBe(7n);
    expect(() => applyBps(100n, 10001)).toThrow(BadRequestException);
  });

  it('masks and hashes payout account references without storing the raw value', () => {
    expect(maskAccountReference('017000001234')).toBe('********1234');
    expect(maskAccountReference('123')).toBe('***');
    expect(hashAccountReference('0170 0000 1234')).toBe(hashAccountReference('017000001234'));
    expect(hashAccountReference('017000001234')).toHaveLength(64);
  });

  it('formats grouped BDT for display', () => {
    expect(formatMinorAsGroupedBdt(123456789n)).toBe('1,234,567.89');
  });
});
