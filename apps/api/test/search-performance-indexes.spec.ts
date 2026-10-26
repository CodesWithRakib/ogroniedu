import { describe, it, expect, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { TutorSearchService } from '../src/modules/tutors/services/tutor-search.service';
import type { SearchTutorsQueryDto } from '../src/modules/tutors/dto';

class MockQueryBuilder {
  clauses: string[] = [];
  parameters: Record<string, unknown> = {};
  orders: string[] = [];
  cloned: MockQueryBuilder[] = [];
  skipVal = 0;
  takeVal = 12;

  innerJoin() {
    return this;
  }
  where(clause: string, params?: Record<string, unknown>) {
    this.clauses.push(clause);
    if (params) Object.assign(this.parameters, params);
    return this;
  }
  andWhere(clause: string, params?: Record<string, unknown>) {
    this.clauses.push(clause);
    if (params) Object.assign(this.parameters, params);
    return this;
  }
  select() {
    return this;
  }
  addSelect() {
    return this;
  }
  setParameters(params: Record<string, unknown>) {
    Object.assign(this.parameters, params);
    return this;
  }
  orderBy(col: string) {
    this.orders.push(col);
    return this;
  }
  addOrderBy(col: string) {
    this.orders.push(col);
    return this;
  }
  offset(n: number) {
    this.skipVal = n;
    return this;
  }
  limit(n: number) {
    this.takeVal = n;
    return this;
  }
  clone() {
    const copy = new MockQueryBuilder();
    copy.clauses = [...this.clauses];
    copy.parameters = { ...this.parameters };
    this.cloned.push(copy);
    return copy;
  }
  async getCount() {
    return 1;
  }
  async getRawMany() {
    return [
      {
        user_id: 'tutor-uuid-1',
        match_score: 120,
        rating_average: 4.9,
        total_reviews: 12,
        distance_km: null,
      },
    ];
  }
}

describe('Phase 10 — Search Architecture & Query Indexing Invariants', () => {
  let service: TutorSearchService;
  let qb: MockQueryBuilder;

  beforeEach(() => {
    qb = new MockQueryBuilder();
    const fakeRepo = {
      createQueryBuilder: () => qb,
      find: async () => [
        {
          userId: 'tutor-uuid-1',
          hourlyRateMinor: 100000,
          yearsExperience: 4,
          teachingModes: ['online'],
          qualifications: [],
          subjects: [],
          serviceAreas: [],
          availabilities: [],
        },
      ],
      findOne: async () => null,
    };
    const fakeUserRepo = {
      find: async () => [
        {
          id: 'tutor-uuid-1',
          displayName: 'Test Tutor',
          displayNameEn: 'Test Tutor',
          status: 'active',
        },
      ],
      findOne: async () => null,
    };
    const fakeTaxonomyRepo = { find: async () => [] };

    service = new TutorSearchService(
      fakeRepo as any,
      fakeUserRepo as any,
      fakeTaxonomyRepo as any,
      fakeTaxonomyRepo as any,
      fakeTaxonomyRepo as any,
    );
  });

  it('INVARIANT: search query strictly enforces verified and published eligibility', async () => {
    await service.searchTutors({ page: 1, limit: 12 });

    const combinedClauses = qb.clauses.join(' AND ');
    expect(combinedClauses).toContain('tp.publication_status = :published');
    expect(combinedClauses).toContain('tp.verification_status = :approved');
    expect(combinedClauses).toContain("tp.safety_hold_status != 'safety_hold'");
    expect(combinedClauses).toContain("u.status = 'active'");
    expect(combinedClauses).toContain('u.deleted_at IS NULL');
    expect(qb.parameters.published).toBe('published');
    expect(qb.parameters.approved).toBe('approved');
  });

  it('INVARIANT: stable pagination always terminates with tp.user_id ASC', async () => {
    await service.searchTutors({ page: 1, limit: 12, sort: 'price_asc' });

    const rankedQb = qb.cloned[0];
    expect(rankedQb).toBeDefined();
    expect(rankedQb.orders).toContain('tp.hourly_rate_minor');
    expect(rankedQb.orders).toContain('tp.user_id');
  });

  it('NEGATIVE TEST: rejects inverted price ranges with BadRequestException', async () => {
    const invalidQuery: SearchTutorsQueryDto = {
      minPrice: 50000,
      maxPrice: 20000,
    };

    await expect(service.searchTutors(invalidQuery)).rejects.toThrow(BadRequestException);
  });

  it('INVARIANT: keyword queries parameterize term safely against SQL injection', async () => {
    await service.searchTutors({ q: "Robert'; DROP TABLE users;--" });

    expect(qb.parameters.term).toBe("%Robert'; DROP TABLE users;--%");
    const combined = qb.clauses.join(' ');
    expect(combined).toContain('u.display_name ILIKE :term');
  });
});
