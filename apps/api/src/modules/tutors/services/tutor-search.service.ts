import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { TutorProfileEntity } from '../entities/tutor-profile.entity';
import { UserEntity } from '../../auth/entities/user.entity';
import { SubjectEntity } from '../../taxonomy/entities/subject.entity';
import { EducationLevelEntity } from '../../taxonomy/entities/education-level.entity';
import {
  TutorPublicProfileDto,
  SearchTutorsQueryDto,
  SearchTutorsResponseDto,
  resolveTutorSearchPageSize,
} from '../dto';

/**
 * Public discovery: sanitized public profiles + multi-dimensional search.
 * Never exposes private PII or verification evidence.
 * NOTE: current implementation filters in memory over published profiles;
 * indexed DB-query rewrite is tracked follow-up (see refactoring-backlog B/C).
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
  ) {}

  async getPublicProfile(tutorUserId: string): Promise<TutorPublicProfileDto> {
    const profile = await this.profileRepo.findOne({
      where: { userId: tutorUserId },
      relations: { qualifications: true, subjects: true, serviceAreas: true, availabilities: true },
    });
    if (
      !profile ||
      profile.publicationStatus !== 'published' ||
      profile.verificationStatus !== 'approved'
    ) {
      throw new NotFoundException('Tutor profile is not published or verified.');
    }
    const user = await this.userRepo.findOne({ where: { id: tutorUserId } });
    if (!user || user.status !== 'active') {
      throw new NotFoundException('Tutor account is inactive or not found.');
    }
    const badges: string[] = ['verified_tutor'];
    const approvedQualifications = (profile.qualifications || []).filter(
      (q) => q.reviewStatus === 'approved',
    );
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
    const subjectIds = (profile.subjects || []).map((s) => s.subjectId);
    const levelIds = (profile.subjects || []).map((s) => s.educationLevelId);
    const taxonomySubjects =
      subjectIds.length > 0
        ? await this.taxonomySubjectRepo.find({ where: { id: In(subjectIds) } })
        : [];
    const taxonomyLevels =
      levelIds.length > 0 ? await this.taxonomyLevelRepo.find({ where: { id: In(levelIds) } }) : [];
    const publicSubjects = (profile.subjects || []).map((s) => {
      const sub = taxonomySubjects.find((t) => t.id === s.subjectId);
      const lvl = taxonomyLevels.find((l) => l.id === s.educationLevelId);
      return {
        id: s.id,
        subjectId: s.subjectId,
        subjectCode: sub?.code || 'unknown',
        subjectNameEn: sub?.nameEn || 'Subject',
        subjectNameBn: sub?.nameBn || 'বিষয়',
        educationLevelId: s.educationLevelId,
        educationLevelCode: lvl?.code || 'unknown',
        educationLevelNameEn: lvl?.nameEn || 'Level',
        educationLevelNameBn: lvl?.nameBn || 'শ্রেণি',
        curriculumCode: s.curriculumId,
        rateMinor: s.rateMinor || profile.hourlyRateMinor,
      };
    });
    const publicServiceAreas = (profile.serviceAreas || []).map((a) => ({
      id: a.id,
      districtCode: a.districtCode,
      upazilaCode: a.upazilaCode,
      localityName: a.localityName,
      radiusKm: a.radiusKm ? Number(a.radiusKm) : null,
    }));
    const publicAvailability = (profile.availabilities || [])
      .filter((av) => av.isActive)
      .map((av) => ({
        weekday: av.weekday,
        startLocal: av.startLocal,
        endLocal: av.endLocal,
        timezone: av.timezone,
      }));
    return {
      id: profile.userId,
      displayName: user.displayName,
      headline: profile.headline,
      bio: profile.bio,
      yearsExperience: profile.yearsExperience,
      teachingModes: profile.teachingModes,
      hourlyRateMinor: profile.hourlyRateMinor,
      currency: profile.currency,
      responseTimeMinutes: profile.responseTimeMinutes,
      badges,
      subjects: publicSubjects,
      serviceAreas: publicServiceAreas,
      availability: publicAvailability,
    };
  }

  async searchTutors(query: SearchTutorsQueryDto): Promise<SearchTutorsResponseDto> {
    const publishedProfiles = await this.profileRepo.find({
      where: { publicationStatus: 'published', verificationStatus: 'approved' },
      relations: { qualifications: true, subjects: true, serviceAreas: true, availabilities: true },
    });
    const userIds = publishedProfiles.map((p) => p.userId);
    const users =
      userIds.length > 0 ? await this.userRepo.find({ where: { id: In(userIds) } }) : [];
    let candidates = publishedProfiles.filter((p) => {
      const u = users.find((usr) => usr.id === p.userId);
      return u && u.status === 'active' && !u.deletedAt;
    });
    if (query.q && query.q.trim()) {
      const term = query.q.trim().toLowerCase();
      candidates = candidates.filter((p) => {
        const u = users.find((usr) => usr.id === p.userId);
        const matchesUser = u?.displayName?.toLowerCase().includes(term);
        const matchesHeadline = p.headline?.toLowerCase().includes(term);
        const matchesBio = p.bio?.toLowerCase().includes(term);
        const matchesQualification = (p.qualifications || []).some(
          (q) =>
            q.institution?.toLowerCase().includes(term) ||
            q.title?.toLowerCase().includes(term),
        );
        const matchesServiceArea = (p.serviceAreas || []).some(
          (a) =>
            a.districtCode?.toLowerCase().includes(term) ||
            a.localityName?.toLowerCase().includes(term) ||
            a.upazilaCode?.toLowerCase().includes(term),
        );
        return (
          matchesUser ||
          matchesHeadline ||
          matchesBio ||
          matchesQualification ||
          matchesServiceArea
        );
      });
    }
    if (query.mode) {
      candidates = candidates.filter((p) => (p.teachingModes || []).includes(query.mode!));
    }
    if (query.minPrice !== undefined) {
      candidates = candidates.filter((p) => Number(p.hourlyRateMinor || 0) >= query.minPrice!);
    }
    if (query.maxPrice !== undefined) {
      candidates = candidates.filter((p) => Number(p.hourlyRateMinor || 0) <= query.maxPrice!);
    }
    if (query.subjectId) {
      candidates = candidates.filter((p) =>
        (p.subjects || []).some((s) => s.subjectId === query.subjectId),
      );
    }
    if (query.educationLevelId) {
      candidates = candidates.filter((p) =>
        (p.subjects || []).some((s) => s.educationLevelId === query.educationLevelId),
      );
    }
    if (query.curriculumId) {
      candidates = candidates.filter((p) =>
        (p.subjects || []).some((s) => s.curriculumId === query.curriculumId),
      );
    }
    if (query.districtCode) {
      candidates = candidates.filter((p) =>
        (p.serviceAreas || []).some(
          (a) => a.districtCode.toLowerCase() === query.districtCode!.toLowerCase(),
        ),
      );
    }
    if (query.upazilaCode) {
      candidates = candidates.filter((p) =>
        (p.serviceAreas || []).some(
          (a) => a.upazilaCode && a.upazilaCode.toLowerCase() === query.upazilaCode!.toLowerCase(),
        ),
      );
    }
    const allSubjectIds = Array.from(
      new Set(candidates.flatMap((c) => (c.subjects || []).map((s) => s.subjectId))),
    );
    const allLevelIds = Array.from(
      new Set(candidates.flatMap((c) => (c.subjects || []).map((s) => s.educationLevelId))),
    );
    const taxonomySubjects =
      allSubjectIds.length > 0
        ? await this.taxonomySubjectRepo.find({ where: { id: In(allSubjectIds) } })
        : [];
    const taxonomyLevels =
      allLevelIds.length > 0
        ? await this.taxonomyLevelRepo.find({ where: { id: In(allLevelIds) } })
        : [];
    const scoredItems = candidates.map((profile) => {
      const user = users.find((u) => u.id === profile.userId)!;
      const badges: string[] = ['verified_tutor'];
      const rankingReasons: string[] = ['Approved Platform Tutor (+100)'];
      let matchScore = 100;
      const approvedQualifications = (profile.qualifications || []).filter(
        (q) => q.reviewStatus === 'approved',
      );
      if (approvedQualifications.some((q) => q.qualificationType === 'nid')) {
        badges.push('verified_identity');
        matchScore += 20;
        rankingReasons.push('Verified Government Identity (+20)');
      }
      if (
        approvedQualifications.some(
          (q) => q.qualificationType === 'academic_certificate' || q.qualificationType === 'degree',
        )
      ) {
        badges.push('verified_academic');
        matchScore += 20;
        rankingReasons.push('Verified Academic Credentials (+20)');
      }
      const exp = profile.yearsExperience || 0;
      if (exp > 0) {
        const expScore = Math.min(exp * 5, 50);
        matchScore += expScore;
        rankingReasons.push(`${exp} Years Experience (+${expScore})`);
      }
      if (profile.responseTimeMinutes && profile.responseTimeMinutes <= 60) {
        matchScore += 10;
        rankingReasons.push('Fast Responder (+10)');
      }
      const publicSubjects = (profile.subjects || []).map((s) => {
        const sub = taxonomySubjects.find((t) => t.id === s.subjectId);
        const lvl = taxonomyLevels.find((l) => l.id === s.educationLevelId);
        return {
          id: s.id,
          subjectId: s.subjectId,
          subjectCode: sub?.code || 'unknown',
          subjectNameEn: sub?.nameEn || 'Subject',
          subjectNameBn: sub?.nameBn || 'বিষয়',
          educationLevelId: s.educationLevelId,
          educationLevelCode: lvl?.code || 'unknown',
          educationLevelNameEn: lvl?.nameEn || 'Level',
          educationLevelNameBn: lvl?.nameBn || 'শ্রেণি',
          curriculumCode: s.curriculumId,
          rateMinor: s.rateMinor || profile.hourlyRateMinor,
        };
      });
      const publicServiceAreas = (profile.serviceAreas || []).map((a) => ({
        id: a.id,
        districtCode: a.districtCode,
        upazilaCode: a.upazilaCode,
        localityName: a.localityName,
        radiusKm: a.radiusKm ? Number(a.radiusKm) : null,
      }));
      return {
        id: profile.userId,
        displayName: user.displayName,
        headline: profile.headline,
        bio: profile.bio,
        yearsExperience: profile.yearsExperience,
        teachingModes: profile.teachingModes,
        hourlyRateMinor: profile.hourlyRateMinor,
        currency: profile.currency,
        responseTimeMinutes: profile.responseTimeMinutes,
        badges,
        matchScore,
        rankingReasons,
        subjects: publicSubjects,
        serviceAreas: publicServiceAreas,
      };
    });
    const sort = query.sort || 'recommended';
    scoredItems.sort((a, b) => {
      switch (sort) {
        case 'price_asc':
          return Number(a.hourlyRateMinor || 0) - Number(b.hourlyRateMinor || 0);
        case 'price_desc':
          return Number(b.hourlyRateMinor || 0) - Number(a.hourlyRateMinor || 0);
        case 'experience_desc':
          return (b.yearsExperience || 0) - (a.yearsExperience || 0);
        case 'recommended':
        default:
          return b.matchScore - a.matchScore;
      }
    });
    const page = Math.max(1, query.page || 1);
    const limit = resolveTutorSearchPageSize(query);
    const total = scoredItems.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginatedData = scoredItems.slice((page - 1) * limit, page * limit);
    return { data: paginatedData, total, page, limit, totalPages };
  }
}
