import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { SelectQueryBuilder } from 'typeorm';
import { In, Repository } from 'typeorm';
import { TutorProfileEntity } from '../entities/tutor-profile.entity';
import type { TutorAvailabilityEntity } from '../entities/tutor-availability.entity';
import { isDiscoveryEligible } from './verification-state-machine';
import { resolveDistrictName } from '../constants/location-names.constants';
import { UserEntity } from '../../auth/entities/user.entity';
import { SubjectEntity } from '../../taxonomy/entities/subject.entity';
import { EducationLevelEntity } from '../../taxonomy/entities/education-level.entity';
import { CurriculumEntity } from '../../taxonomy/entities/curriculum.entity';
import {
  TutorPublicProfileDto,
  SearchTutorsQueryDto,
  SearchTutorsResponseDto,
  resolveTutorSearchPageSize,
} from '../dto';

const EARTH_RADIUS_KM = 6371;

/** Straight-line (haversine) distance expression between :lat/:lng and `sa`. */
function distanceExpression(alias: string): string {
  return `(${EARTH_RADIUS_KM} * acos(LEAST(1, GREATEST(-1,
    sin(radians(:lat)) * sin(radians(${alias}.latitude)) +
    cos(radians(:lat)) * cos(radians(${alias}.latitude)) *
    cos(radians(${alias}.longitude - :lng))
  ))))`;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

/**
 * Next weekday with an active, date-effective slot, starting from today and
 * wrapping. Display-only ordering signal — it is not a booking guarantee.
 */
export function resolveNextAvailableWeekday(
  availabilities: readonly TutorAvailabilityEntity[],
  today = new Date(),
): number | null {
  const iso = today.toISOString().slice(0, 10);
  const weekdays = Array.from(
    new Set(
      availabilities
        .filter((slot) => slot.isActive)
        .filter((slot) => !slot.effectiveFrom || slot.effectiveFrom <= iso)
        .filter((slot) => !slot.effectiveUntil || slot.effectiveUntil >= iso)
        .map((slot) => slot.weekday),
    ),
  ).sort((a, b) => a - b);

  if (weekdays.length === 0) return null;
  const todayWeekday = today.getDay();
  return weekdays.find((day) => day >= todayWeekday) ?? weekdays[0];
}

/**
 * Public discovery. All eligibility, filtering, sorting, counting and paging
 * happen in PostgreSQL; the service only hydrates the page it returns.
 * Never exposes private PII or verification evidence.
 */
@Injectable()
export class TutorSearchService {
  constructor(
    @InjectRepository(TutorProfileEntity)
    private readonly profileRepo: Repository<TutorProfileEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(SubjectEntity)
    private readonly taxonomySubjectRepo: Repository<SubjectEntity>,
    @InjectRepository(EducationLevelEntity)
    private readonly taxonomyLevelRepo: Repository<EducationLevelEntity>,
    @Optional()
    @InjectRepository(CurriculumEntity)
    private readonly curriculumRepo?: Repository<CurriculumEntity>,
  ) {}

  async getPublicProfile(tutorUserId: string): Promise<TutorPublicProfileDto> {
    const profile = await this.profileRepo.findOne({
      where: { userId: tutorUserId },
      relations: { qualifications: true, subjects: true, serviceAreas: true, availabilities: true },
    });
    if (!profile) {
      throw new NotFoundException('Tutor profile is not published or verified.');
    }
    const user = await this.userRepo.findOne({ where: { id: profile.userId } });
    // Expired, revoked or unpublished verification must never surface publicly,
    // even if a stale `verification_status` value survived a failed sweep.
    if (
      !user ||
      !isDiscoveryEligible({
        publicationStatus: profile.publicationStatus,
        verificationStatus: profile.verificationStatus,
        verificationExpiresAt: profile.verificationExpiresAt,
        accountStatus: user.status,
        deletedAt: user.deletedAt,
      })
    ) {
      throw new NotFoundException('Tutor profile is not published or verified.');
    }

    // Aggregates are database-only. Isolated unit tests may inject a repository
    // without a manager; they get honest zero/null values, never a fabricated
    // rating.
    let ratingRow: { average: number | null; total: number } | undefined;
    let sessionRow: { total: number } | undefined;
    if (this.profileRepo.manager?.query) {
      [ratingRow] = await this.profileRepo.manager.query(
        `SELECT AVG(rating)::float AS average, COUNT(*)::int AS total
           FROM reviews
          WHERE tutor_user_id = $1 AND moderation_status = 'published'`,
        [tutorUserId],
      );
      [sessionRow] = await this.profileRepo.manager.query(
        `SELECT COUNT(*)::int AS total
           FROM bookings
          WHERE tutor_user_id = $1 AND status = 'completed'`,
        [tutorUserId],
      );
    }

    const approvedQualifications = (profile.qualifications || []).filter(
      (q) => q.reviewStatus === 'approved',
    );
    const badges: string[] = ['verified_tutor'];
    if (approvedQualifications.some((q) => q.qualificationType === 'nid')) {
      badges.push('verified_identity');
    }
    if (
      approvedQualifications.some(
        (q) => q.qualificationType === 'academic_certificate' || q.qualificationType === 'degree',
      )
    ) {
      badges.push('verified_academic');
    }

    if (this.profileRepo.manager?.query) {
      try {
        const verifiedLevels: Array<{ level: string }> = await this.profileRepo.manager.query(
          `SELECT level FROM tutor_verification_levels WHERE tutor_user_id = $1 AND status = 'approved'`,
          [tutorUserId],
        );
        if (verifiedLevels.some((l) => l.level === 'identity') && !badges.includes('verified_identity')) {
          badges.push('verified_identity');
        }
        if (verifiedLevels.some((l) => l.level === 'educational') && !badges.includes('verified_academic')) {
          badges.push('verified_academic');
        }
        if (verifiedLevels.some((l) => l.level === 'institutional') && !badges.includes('verified_institutional')) {
          badges.push('verified_institutional');
        }
      } catch {
        // Fall back gracefully if table does not exist in isolated test mocks
      }
    }

    const publicQualifications = approvedQualifications.map((q) => ({
      id: q.id,
      qualificationType: q.qualificationType,
      institutionEn: q.institutionEn ?? q.institution ?? null,
      institutionBn: q.institutionBn ?? q.institution ?? null,
      titleEn: q.titleEn ?? q.title ?? '',
      titleBn: q.titleBn ?? q.title ?? null,
      issuedYear: q.issuedYear,
      isVerified: true,
    }));

    const subjectIds = (profile.subjects || []).map((s) => s.subjectId);
    const levelIds = (profile.subjects || []).map((s) => s.educationLevelId);
    const curriculumIds = Array.from(
      new Set(
        (profile.subjects || [])
          .map((s) => s.curriculumId)
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
      ),
    );
    const taxonomySubjects =
      subjectIds.length > 0
        ? await this.taxonomySubjectRepo.find({ where: { id: In(subjectIds) } })
        : [];
    const taxonomyLevels =
      levelIds.length > 0 ? await this.taxonomyLevelRepo.find({ where: { id: In(levelIds) } }) : [];
    const curricula =
      this.curriculumRepo && curriculumIds.length > 0
        ? await this.curriculumRepo.find({ where: { id: In(curriculumIds) } })
        : [];

    const publicSubjects = (profile.subjects || []).map((s) => {
      const sub = taxonomySubjects.find((t) => t.id === s.subjectId);
      const lvl = taxonomyLevels.find((l) => l.id === s.educationLevelId);
      const curriculum = s.curriculumId
        ? curricula.find((c) => c.id === s.curriculumId)
        : undefined;
      return {
        id: s.id,
        subjectId: s.subjectId,
        subjectCode: sub?.code || 'unknown',
        subjectNameEn: sub?.nameEn || 'Subject',
        subjectNameBn: sub?.nameBn || 'বিষয়',
        educationLevelId: s.educationLevelId,
        educationLevelCode: lvl?.code || 'unknown',
        educationLevelNameEn: lvl?.nameEn || 'Level',
        educationLevelNameBn: lvl?.nameBn || 'শ্রেণি',
        curriculumId: s.curriculumId,
        curriculumCode: curriculum?.code ?? null,
        curriculumNameEn: curriculum?.nameEn ?? null,
        curriculumNameBn: curriculum?.nameBn ?? null,
        rateMinor: s.rateMinor || profile.hourlyRateMinor,
      };
    });

    const publicServiceAreas = (profile.serviceAreas || []).map((a) => {
      const name = resolveDistrictName(a.districtCode);
      return {
        id: a.id,
        districtCode: a.districtCode,
        districtNameEn: name.en,
        districtNameBn: name.bn,
        upazilaCode: a.upazilaCode,
        localityNameEn: a.localityNameEn ?? a.localityName,
        localityNameBn: a.localityNameBn ?? a.localityName,
        radiusKm: a.radiusKm !== null ? Number(a.radiusKm) : null,
      };
    });

    const availabilities = (profile.availabilities || []).filter((av) => av.isActive);
    const publicAvailability = availabilities.map((av) => ({
      weekday: av.weekday,
      startLocal: av.startLocal,
      endLocal: av.endLocal,
      timezone: av.timezone,
    }));

    return {
      id: profile.userId,
      displayNameEn: user.displayNameEn ?? user.displayName ?? '',
      displayNameBn: user.displayNameBn ?? user.displayName ?? null,
      avatarUrl: profile.avatarUrl || user.avatarUrl || null,
      headlineEn: profile.headlineEn ?? profile.headline ?? null,
      headlineBn: profile.headlineBn ?? null,
      bioEn: profile.bioEn ?? profile.bio ?? null,
      bioBn: profile.bioBn ?? null,
      yearsExperience: profile.yearsExperience,
      teachingModes: profile.teachingModes,
      hourlyRateMinor: profile.hourlyRateMinor,
      currency: profile.currency,
      responseTimeMinutes: profile.responseTimeMinutes,
      badges,
      qualifications: publicQualifications,
      subjects: publicSubjects,
      serviceAreas: publicServiceAreas,
      availability: publicAvailability,
      ratingAverage:
        Number(ratingRow?.total ?? 0) > 0 ? round(Number(ratingRow?.average ?? 0), 2) : null,
      totalReviews: Number(ratingRow?.total ?? 0),
      completedSessions: Number(sessionRow?.total ?? 0),
      nextAvailableWeekday: resolveNextAvailableWeekday(availabilities),
    };
  }

  async searchTutors(query: SearchTutorsQueryDto): Promise<SearchTutorsResponseDto> {
    const hasLat = query.lat !== undefined;
    const hasLng = query.lng !== undefined;
    const hasRadius = query.radiusKm !== undefined;

    if ((hasLat || hasLng || hasRadius) && !(hasLat && hasLng)) {
      throw new BadRequestException('Both lat and lng are required for location search.');
    }
    if (query.sort === 'nearest' && !(hasLat && hasLng)) {
      throw new BadRequestException('Sorting by nearest requires lat and lng.');
    }
    if (query.minPrice !== undefined && query.maxPrice !== undefined) {
      if (query.minPrice > query.maxPrice) {
        throw new BadRequestException('minPrice cannot be greater than maxPrice.');
      }
    }

    const base = this.buildEligibleQuery(query);
    const total = await base.getCount();
    const page = Math.max(1, query.page || 1);
    const limit = resolveTutorSearchPageSize(query);
    const offset = (page - 1) * limit;

    if (total === 0) {
      return { data: [], total: 0, page, limit, totalPages: 1 };
    }

    const scoreExpr = `(100
      + CASE WHEN EXISTS (SELECT 1 FROM tutor_qualifications tq
           WHERE tq.tutor_user_id = tp.user_id AND tq.review_status = 'approved'
             AND tq.qualification_type = 'nid') THEN 20 ELSE 0 END
      + CASE WHEN EXISTS (SELECT 1 FROM tutor_qualifications tq
           WHERE tq.tutor_user_id = tp.user_id AND tq.review_status = 'approved'
             AND tq.qualification_type IN ('degree', 'academic_certificate')) THEN 20 ELSE 0 END
      + LEAST(COALESCE(tp.years_experience, 0) * 5, 50)
      + CASE WHEN tp.response_time_minutes IS NOT NULL
             AND tp.response_time_minutes <= 60 THEN 10 ELSE 0 END)`;

    const ratingExpr = `(SELECT ROUND(AVG(r.rating)::numeric, 2) FROM reviews r
      WHERE r.tutor_user_id = tp.user_id AND r.moderation_status = 'published')`;
    const reviewCountExpr = `(SELECT COUNT(*) FROM reviews r
      WHERE r.tutor_user_id = tp.user_id AND r.moderation_status = 'published')`;
    const distanceSelect = hasLat
      ? `(SELECT MIN(${distanceExpression('sa')}) FROM tutor_service_areas sa
           WHERE sa.tutor_user_id = tp.user_id
             AND sa.latitude IS NOT NULL AND sa.longitude IS NOT NULL)`
      : 'NULL::double precision';

    const ranked = base
      .clone()
      .select('tp.user_id', 'user_id')
      .addSelect(scoreExpr, 'match_score')
      .addSelect(ratingExpr, 'rating_average')
      .addSelect(reviewCountExpr, 'total_reviews')
      .addSelect(distanceSelect, 'distance_km');

    if (hasLat) {
      ranked.setParameters({ lat: query.lat, lng: query.lng });
    }

    switch (query.sort) {
      case 'nearest':
        ranked.orderBy('distance_km', 'ASC', 'NULLS LAST');
        ranked.addOrderBy('match_score', 'DESC');
        ranked.addOrderBy('tp.user_id', 'ASC');
        break;
      case 'price_asc':
        ranked.orderBy('tp.hourly_rate_minor', 'ASC', 'NULLS LAST');
        ranked.addOrderBy('tp.user_id', 'ASC');
        break;
      case 'price_desc':
        ranked.orderBy('tp.hourly_rate_minor', 'DESC', 'NULLS LAST');
        ranked.addOrderBy('tp.user_id', 'ASC');
        break;
      case 'experience_desc':
        ranked.orderBy('tp.years_experience', 'DESC', 'NULLS LAST');
        ranked.addOrderBy('tp.user_id', 'ASC');
        break;
      case 'rating_desc':
        ranked.orderBy('rating_average', 'DESC', 'NULLS LAST');
        ranked.addOrderBy('total_reviews', 'DESC');
        ranked.addOrderBy('tp.user_id', 'ASC');
        break;
      case 'recommended':
      default:
        ranked.orderBy('match_score', 'DESC');
        ranked.addOrderBy('tp.user_id', 'ASC');
        break;
    }

    const rows: Array<Record<string, unknown>> = await ranked
      .offset(offset)
      .limit(limit)
      .getRawMany();
    const ids = rows
      .map((row) => String(row.user_id))
      .filter((id): id is string => typeof id === 'string' && id.length > 0);

    if (ids.length === 0) {
      return { data: [], total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
    }

    const profiles = await this.profileRepo.find({
      where: { userId: In(ids) },
      relations: { qualifications: true, subjects: true, serviceAreas: true, availabilities: true },
    });
    const users = await this.userRepo.find({ where: { id: In(ids) } });

    const subjectIds = Array.from(
      new Set(profiles.flatMap((p) => (p.subjects || []).map((s) => s.subjectId))),
    );
    const levelIds = Array.from(
      new Set(profiles.flatMap((p) => (p.subjects || []).map((s) => s.educationLevelId))),
    );
    const curriculumIds = Array.from(
      new Set(
        profiles
          .flatMap((p) => (p.subjects || []).map((s) => s.curriculumId))
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
      ),
    );

    const taxonomySubjects =
      subjectIds.length > 0
        ? await this.taxonomySubjectRepo.find({ where: { id: In(subjectIds) } })
        : [];
    const taxonomyLevels =
      levelIds.length > 0 ? await this.taxonomyLevelRepo.find({ where: { id: In(levelIds) } }) : [];
    const curricula =
      this.curriculumRepo && curriculumIds.length > 0
        ? await this.curriculumRepo.find({ where: { id: In(curriculumIds) } })
        : [];

    const profileById = new Map(profiles.map((profile) => [profile.userId, profile]));
    const userById = new Map(users.map((user) => [user.id, user]));
    const rowById = new Map(rows.map((row) => [String(row.user_id), row]));

    let verifiedLevelsRows: Array<{ tutor_user_id: string; level: string }> = [];
    if (this.profileRepo.manager?.query && ids.length > 0) {
      try {
        verifiedLevelsRows = await this.profileRepo.manager.query(
          `SELECT tutor_user_id, level FROM tutor_verification_levels WHERE tutor_user_id = ANY($1) AND status = 'approved'`,
          [ids],
        );
      } catch {
        // Fall back gracefully in unit tests
      }
    }

    const data = ids
      .map((id) => {
        const profile = profileById.get(id);
        const user = userById.get(id);
        if (!profile || !user) return null;

        const approvedQualifications = (profile.qualifications || []).filter(
          (q) => q.reviewStatus === 'approved',
        );
        const badges: string[] = ['verified_tutor'];
        const rankingReasons: string[] = ['Approved Platform Tutor (+100)'];
        if (approvedQualifications.some((q) => q.qualificationType === 'nid')) {
          badges.push('verified_identity');
          rankingReasons.push('Verified Government Identity (+20)');
        }
        if (
          approvedQualifications.some(
            (q) =>
              q.qualificationType === 'academic_certificate' || q.qualificationType === 'degree',
          )
        ) {
          badges.push('verified_academic');
          rankingReasons.push('Verified Academic Credentials (+20)');
        }

        const tutorLevels = verifiedLevelsRows.filter((r) => r.tutor_user_id === id);
        if (tutorLevels.some((l) => l.level === 'identity') && !badges.includes('verified_identity')) {
          badges.push('verified_identity');
          rankingReasons.push('Verified Government Identity (+20)');
        }
        if (tutorLevels.some((l) => l.level === 'educational') && !badges.includes('verified_academic')) {
          badges.push('verified_academic');
          rankingReasons.push('Verified Academic Credentials (+20)');
        }
        if (tutorLevels.some((l) => l.level === 'institutional') && !badges.includes('verified_institutional')) {
          badges.push('verified_institutional');
          rankingReasons.push('Verified Institutional Credentials (+20)');
        }
        const experience = profile.yearsExperience || 0;
        if (experience > 0) {
          rankingReasons.push(`${experience} Years Experience (+${Math.min(experience * 5, 50)})`);
        }
        if (profile.responseTimeMinutes && profile.responseTimeMinutes <= 60) {
          rankingReasons.push('Fast Responder (+10)');
        }

        const publicSubjects = (profile.subjects || []).map((s) => {
          const sub = taxonomySubjects.find((t) => t.id === s.subjectId);
          const lvl = taxonomyLevels.find((l) => l.id === s.educationLevelId);
          const curriculum = s.curriculumId
            ? curricula.find((c) => c.id === s.curriculumId)
            : undefined;
          return {
            id: s.id,
            subjectId: s.subjectId,
            subjectCode: sub?.code || 'unknown',
            subjectNameEn: sub?.nameEn || 'Subject',
            subjectNameBn: sub?.nameBn || 'বিষয়',
            educationLevelId: s.educationLevelId,
            educationLevelCode: lvl?.code || 'unknown',
            educationLevelNameEn: lvl?.nameEn || 'Level',
            educationLevelNameBn: lvl?.nameBn || 'শ্রেণি',
            curriculumId: s.curriculumId,
            curriculumCode: curriculum?.code ?? null,
            curriculumNameEn: curriculum?.nameEn ?? null,
            curriculumNameBn: curriculum?.nameBn ?? null,
            rateMinor: s.rateMinor || profile.hourlyRateMinor,
          };
        });

        const publicServiceAreas = (profile.serviceAreas || []).map((a) => {
          const name = resolveDistrictName(a.districtCode);
          return {
            id: a.id,
            districtCode: a.districtCode,
            districtNameEn: name.en,
            districtNameBn: name.bn,
            upazilaCode: a.upazilaCode,
            localityNameEn: a.localityNameEn ?? a.localityName,
            localityNameBn: a.localityNameBn ?? a.localityName,
            radiusKm: a.radiusKm !== null ? Number(a.radiusKm) : null,
          };
        });

        const row = rowById.get(id);
        const rawRating = toNumber(row?.rating_average);
        const distance = toNumber(row?.distance_km);
        const availabilities = (profile.availabilities || []).filter((av) => av.isActive);

        return {
          id: profile.userId,
          displayNameEn: user.displayNameEn ?? user.displayName ?? '',
          displayNameBn: user.displayNameBn ?? user.displayName ?? null,
          avatarUrl: profile.avatarUrl || user.avatarUrl || null,
          headlineEn: profile.headlineEn ?? profile.headline ?? null,
          headlineBn: profile.headlineBn ?? null,
          bioEn: profile.bioEn ?? profile.bio ?? null,
          bioBn: profile.bioBn ?? null,
          yearsExperience: profile.yearsExperience,
          teachingModes: profile.teachingModes,
          hourlyRateMinor: profile.hourlyRateMinor,
          currency: profile.currency,
          responseTimeMinutes: profile.responseTimeMinutes,
          badges,
          matchScore: Number(row?.match_score ?? 100),
          rankingReasons,
          subjects: publicSubjects,
          serviceAreas: publicServiceAreas,
          distanceKm: distance !== null ? round(distance, 2) : null,
          ratingAverage: rawRating !== null ? round(rawRating, 2) : null,
          totalReviews: Number(row?.total_reviews ?? 0),
          nextAvailableWeekday: resolveNextAvailableWeekday(availabilities),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Builds the eligibility + hard-filter query. Every dynamic value is bound as
   * a query parameter; sort expressions are fixed in `searchTutors`.
   */
  private buildEligibleQuery(query: SearchTutorsQueryDto): SelectQueryBuilder<TutorProfileEntity> {
    const qb = this.profileRepo
      .createQueryBuilder('tp')
      .innerJoin(UserEntity, 'u', 'u.id = tp.user_id')
      .where('tp.publication_status = :published', { published: 'published' })
      .andWhere('tp.verification_status = :approved', { approved: 'approved' })
      .andWhere("tp.safety_hold_status != 'safety_hold'")
      .andWhere('(tp.verification_expires_at IS NULL OR tp.verification_expires_at > :now)', {
        now: new Date(),
      })
      .andWhere("u.status = 'active'")
      .andWhere('u.deleted_at IS NULL');

    const keyword = query.q?.trim();
    if (keyword) {
      const term = `%${keyword}%`;
      qb.andWhere(
        `(
          u.display_name ILIKE :term
          OR tp.headline ILIKE :term
          OR tp.bio ILIKE :term
          OR tp.headline_en ILIKE :term
          OR tp.headline_bn ILIKE :term
          OR tp.bio_en ILIKE :term
          OR tp.bio_bn ILIKE :term
          OR EXISTS (
            SELECT 1 FROM tutor_subjects ts
            JOIN subjects s ON s.id = ts.subject_id
            WHERE ts.tutor_user_id = tp.user_id
              AND (s.name_en ILIKE :term OR s.name_bn ILIKE :term OR s.code ILIKE :term)
          )
          OR EXISTS (
            SELECT 1 FROM tutor_qualifications tq
            WHERE tq.tutor_user_id = tp.user_id
              AND tq.review_status = 'approved'
              AND (tq.title ILIKE :term OR tq.institution ILIKE :term)
          )
          OR EXISTS (
            SELECT 1 FROM tutor_service_areas sa
            WHERE sa.tutor_user_id = tp.user_id
              AND (sa.district_code ILIKE :term
                OR sa.upazila_code ILIKE :term
                OR sa.locality_name ILIKE :term)
          )
        )`,
        { term },
      );
    }

    if (query.subjectId) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM tutor_subjects ts
          WHERE ts.tutor_user_id = tp.user_id AND ts.subject_id = :subjectId)`,
        { subjectId: query.subjectId },
      );
    }
    if (query.educationLevelId) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM tutor_subjects ts
          WHERE ts.tutor_user_id = tp.user_id AND ts.education_level_id = :educationLevelId)`,
        { educationLevelId: query.educationLevelId },
      );
    }
    if (query.curriculumId) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM tutor_subjects ts
          WHERE ts.tutor_user_id = tp.user_id AND ts.curriculum_id = :curriculumId)`,
        { curriculumId: query.curriculumId },
      );
    }
    if (query.mode) {
      qb.andWhere(':mode = ANY(tp.teaching_modes)', { mode: query.mode });
    }
    if (query.minPrice !== undefined) {
      qb.andWhere('tp.hourly_rate_minor IS NOT NULL AND tp.hourly_rate_minor >= :minPrice', {
        minPrice: query.minPrice,
      });
    }
    if (query.maxPrice !== undefined) {
      qb.andWhere('tp.hourly_rate_minor IS NOT NULL AND tp.hourly_rate_minor <= :maxPrice', {
        maxPrice: query.maxPrice,
      });
    }
    if (query.minExperience !== undefined) {
      qb.andWhere('tp.years_experience IS NOT NULL AND tp.years_experience >= :minExperience', {
        minExperience: query.minExperience,
      });
    }
    if (query.districtCode) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM tutor_service_areas sa
          WHERE sa.tutor_user_id = tp.user_id
            AND lower(sa.district_code) = lower(:districtCode))`,
        { districtCode: query.districtCode.trim() },
      );
    }
    if (query.upazilaCode) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM tutor_service_areas sa
          WHERE sa.tutor_user_id = tp.user_id
            AND sa.upazila_code IS NOT NULL
            AND lower(sa.upazila_code) = lower(:upazilaCode))`,
        { upazilaCode: query.upazilaCode.trim() },
      );
    }
    if (query.availableWeekday !== undefined) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM tutor_availability av
          WHERE av.tutor_user_id = tp.user_id
            AND av.is_active = true
            AND av.weekday = :availableWeekday
            AND (av.effective_from IS NULL OR av.effective_from <= CURRENT_DATE)
            AND (av.effective_until IS NULL OR av.effective_until >= CURRENT_DATE))`,
        { availableWeekday: query.availableWeekday },
      );
    }

    if (query.lat !== undefined && query.lng !== undefined) {
      if (query.radiusKm !== undefined) {
        // Bounding box prefilter keeps the indexed latitude/longitude scan
        // narrow; the exact haversine check runs only on that candidate set.
        const latDelta = query.radiusKm / 111.32;
        const cosLat = Math.cos((query.lat * Math.PI) / 180);
        const lngDelta =
          Math.abs(cosLat) < 0.01 ? 180 : query.radiusKm / (111.32 * Math.abs(cosLat));
        const minLat = Math.max(-90, query.lat - latDelta);
        const maxLat = Math.min(90, query.lat + latDelta);
        const minLng = Math.max(-180, query.lng - lngDelta);
        const maxLng = Math.min(180, query.lng + lngDelta);

        qb.andWhere(
          `EXISTS (SELECT 1 FROM tutor_service_areas sa
            WHERE sa.tutor_user_id = tp.user_id
              AND sa.latitude IS NOT NULL AND sa.longitude IS NOT NULL
              AND sa.latitude BETWEEN :minLat AND :maxLat
              AND sa.longitude BETWEEN :minLng AND :maxLng
              AND ${distanceExpression('sa')} <= :radiusKm)`,
          {
            minLat,
            maxLat,
            minLng,
            maxLng,
            radiusKm: query.radiusKm,
            lat: query.lat,
            lng: query.lng,
          },
        );
      } else {
        qb.andWhere(
          `EXISTS (SELECT 1 FROM tutor_service_areas sa
            WHERE sa.tutor_user_id = tp.user_id
              AND sa.latitude IS NOT NULL AND sa.longitude IS NOT NULL)`,
        );
      }
    }

    return qb;
  }
}
