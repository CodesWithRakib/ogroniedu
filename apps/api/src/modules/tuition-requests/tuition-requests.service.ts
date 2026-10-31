import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  TuitionRequestEntity,
  TuitionRequestStatus,
} from './entities/tuition-request.entity';
import { TuitionRequestSuggestionEntity } from './entities/tuition-request-suggestion.entity';
import { TuitionRequestApplicationEntity } from './entities/tuition-request-application.entity';
import { SubjectEntity } from '../taxonomy/entities/subject.entity';
import { TutorProfileEntity } from '../tutors/entities/tutor-profile.entity';
import { TutorSubjectEntity } from '../tutors/entities/tutor-subject.entity';
import { TutorServiceAreaEntity } from '../tutors/entities/tutor-service-area.entity';
import { UserEntity } from '../auth/entities/user.entity';
import { RoleEntity } from '../auth/entities/role.entity';
import { UserRoleEntity } from '../auth/entities/user-role.entity';
import { StudentProfileEntity } from '../users/entities/student-profile.entity';
import { GuardianStudentLinkEntity } from '../guardians/entities/guardian-student-link.entity';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { isAdminRole } from '../../common/auth/role.utils';
import {
  CreateTuitionRequestDto,
  ApplyTuitionRequestDto,
  SuggestTutorsDto,
  RespondSuggestionDto,
  GetTuitionRequestsQueryDto,
} from './dto';

@Injectable()
export class TuitionRequestsService {
  private readonly logger = new Logger(TuitionRequestsService.name);

  constructor(
    @InjectRepository(TuitionRequestEntity)
    private readonly requestRepo: Repository<TuitionRequestEntity>,
    @InjectRepository(TuitionRequestSuggestionEntity)
    private readonly suggestionRepo: Repository<TuitionRequestSuggestionEntity>,
    @InjectRepository(TuitionRequestApplicationEntity)
    private readonly appRepo: Repository<TuitionRequestApplicationEntity>,
    @InjectRepository(SubjectEntity)
    private readonly subjectRepo: Repository<SubjectEntity>,
    @InjectRepository(TutorProfileEntity)
    private readonly tutorRepo: Repository<TutorProfileEntity>,
    @InjectRepository(TutorSubjectEntity)
    private readonly tutorSubjectRepo: Repository<TutorSubjectEntity>,
    @InjectRepository(TutorServiceAreaEntity)
    private readonly serviceAreaRepo: Repository<TutorServiceAreaEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepo: Repository<UserRoleEntity>,
    @InjectRepository(StudentProfileEntity)
    private readonly studentProfileRepo: Repository<StudentProfileEntity>,
    @InjectRepository(GuardianStudentLinkEntity)
    private readonly linkRepo: Repository<GuardianStudentLinkEntity>,
  ) {}

  /**
   * Helper: Ensure child student account and guardian link exist when guardian creates a tuition request
   */
  private async ensureGuardianChild(
    guardianUserId: string,
    info: {
      studentName: string;
      studentGender?: 'male' | 'female' | 'any';
      institutionName?: string | null;
      curriculumId?: string | null;
      educationLevelId?: string | null;
      streamId?: string | null;
    },
  ): Promise<string> {
    const trimmedName = info.studentName.trim();
    if (!trimmedName) return '';

    // Check existing active links for this guardian
    const links = await this.linkRepo.find({
      where: { guardianUserId, status: 'active' },
    });

    for (const link of links) {
      const studentUser = await this.userRepo.findOne({ where: { id: link.studentUserId } });
      if (
        studentUser &&
        studentUser.displayName.trim().toLowerCase() === trimmedName.toLowerCase()
      ) {
        return studentUser.id;
      }
    }

    // Provision new student account & link under this guardian
    const studentUser = this.userRepo.create({
      displayName: trimmedName,
      email: `child.${guardianUserId.substring(0, 8)}.${Date.now()}@ogroni.internal`,
      status: 'active',
      preferredLocale: 'bn',
      emailVerifiedAt: new Date(),
    });
    const savedStudent = await this.userRepo.save(studentUser);

    // Assign 'student' role
    const studentRole = await this.roleRepo.findOne({ where: { code: 'student' } });
    if (studentRole) {
      const userRole = this.userRoleRepo.create({
        userId: savedStudent.id,
        roleId: studentRole.id,
        grantedBy: guardianUserId,
        grantedAt: new Date(),
      });
      await this.userRoleRepo.save(userRole);
    }

    // Create student profile
    const studentProfile = this.studentProfileRepo.create({
      userId: savedStudent.id,
      institutionName: info.institutionName || null,
      curriculumId: info.curriculumId || null,
      educationLevelId: info.educationLevelId || null,
      stream: info.streamId || null,
      profileVisibility: 'private',
    });
    await this.studentProfileRepo.save(studentProfile);

    // Create active guardian link
    const link = this.linkRepo.create({
      guardianUserId,
      studentUserId: savedStudent.id,
      relationshipType: 'legal_guardian',
      status: 'active',
      consentPolicyVersion: 'v1.0-bd-minor-consent',
      consentRecordedAt: new Date(),
      verifiedBy: guardianUserId,
    });
    await this.linkRepo.save(link);

    this.logger.log(
      `Auto-linked child student ${savedStudent.id} (${trimmedName}) to guardian ${guardianUserId}`,
    );

    return savedStudent.id;
  }

  /**
   * 1. Create a new Tuition Request by Guardian or Student
   */
  async createRequest(
    user: AuthenticatedUser,
    dto: CreateTuitionRequestDto,
  ): Promise<TuitionRequestEntity> {
    if (!dto.subjectIds || dto.subjectIds.length === 0) {
      throw new BadRequestException('At least one subject must be selected');
    }

    const subjects = await this.subjectRepo.find({
      where: { id: In(dto.subjectIds) },
    });

    if (subjects.length === 0) {
      throw new BadRequestException('Invalid subject IDs provided');
    }

    let studentUserId = dto.studentUserId || null;

    // If guardian is creating the request, ensure the child is linked so it appears on /dashboard/guardian/children
    if (user.roles?.includes('guardian')) {
      if (studentUserId) {
        const existing = await this.linkRepo.findOne({
          where: { guardianUserId: user.id, studentUserId },
        });
        if (!existing) {
          const link = this.linkRepo.create({
            guardianUserId: user.id,
            studentUserId,
            relationshipType: 'legal_guardian',
            status: 'active',
            consentPolicyVersion: 'v1.0-bd-minor-consent',
            consentRecordedAt: new Date(),
            verifiedBy: user.id,
          });
          await this.linkRepo.save(link);
        }
      } else {
        try {
          studentUserId = await this.ensureGuardianChild(user.id, {
            studentName: dto.studentName,
            studentGender: dto.studentGender,
            institutionName: dto.institutionName,
            curriculumId: dto.curriculumId,
            educationLevelId: dto.educationLevelId,
            streamId: dto.streamId,
          });
        } catch (err: any) {
          this.logger.warn(`Could not auto-link child: ${err?.message}`);
        }
      }
    }

    const request = this.requestRepo.create({
      guardianUserId: user.id,
      studentUserId,
      studentName: dto.studentName.trim(),
      studentGender: dto.studentGender || 'any',
      institutionName: dto.institutionName ? dto.institutionName.trim() : null,
      curriculumId: dto.curriculumId || null,
      educationLevelId: dto.educationLevelId || null,
      streamId: dto.streamId || null,
      learningMode: dto.learningMode,
      division: dto.division || null,
      district: dto.district || null,
      area: dto.area || null,
      addressDetails: dto.addressDetails ? dto.addressDetails.trim() : null,
      daysPerWeek: dto.daysPerWeek || null,
      preferredDays: dto.preferredDays || [],
      preferredTime: dto.preferredTime || null,
      salaryBudgetMin: dto.salaryBudgetMin || null,
      salaryBudgetMax: dto.salaryBudgetMax || null,
      salaryType: dto.salaryType || 'monthly',
      preferredTutorGender: dto.preferredTutorGender || 'any',
      preferredTutorBackground: dto.preferredTutorBackground || null,
      requirementsNotes: dto.requirementsNotes ? dto.requirementsNotes.trim() : null,
      isVip: Boolean(dto.isVip),
      status: 'open',
      subjects,
    });

    const saved = await this.requestRepo.save(request);
    this.logger.log(`Created tuition request: ${saved.id} (Ref: ${saved.requestReference}) by user ${user.id}`);
    return this.getRequestById(saved.id, user);
  }

  /**
   * 2. Get all requests created by the current Guardian
   */
  async getGuardianRequests(user: AuthenticatedUser): Promise<TuitionRequestEntity[]> {
    return this.requestRepo.find({
      where: { guardianUserId: user.id },
      relations: {
        subjects: true,
        curriculum: true,
        educationLevel: true,
        stream: true,
        assignedTutor: { user: true },
        suggestions: { tutorProfile: { user: true } },
        applications: { tutorProfile: { user: true } },
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 3. Get single Tuition Request by ID
   */
  async getRequestById(id: string, user?: AuthenticatedUser): Promise<TuitionRequestEntity> {
    const request = await this.requestRepo.findOne({
      where: { id },
      relations: {
        subjects: true,
        curriculum: true,
        educationLevel: true,
        stream: true,
        guardianUser: true,
        studentUser: true,
        assignedTutor: { user: true },
        suggestions: { tutorProfile: { user: true } },
        applications: { tutorProfile: { user: true } },
      },
    });

    if (!request) {
      throw new NotFoundException(`Tuition request with ID ${id} not found`);
    }

    // Mask sensitive address details for general tutors until matched/confirmed
    const isOwner = user && user.id === request.guardianUserId;
    const isAdmin = user && isAdminRole(user);
    const isAssigned = user && user.id === request.assignedTutorUserId;

    if (!isOwner && !isAdmin && !isAssigned) {
      request.addressDetails = null; // protect privacy
      if (request.guardianUser) {
        request.guardianUser.phoneE164 = null;
        request.guardianUser.email = null;
      }
    }

    return request;
  }

  /**
   * 4. Job Board for Tutors to browse open requests
   */
  async getJobBoard(
    query: GetTuitionRequestsQueryDto,
    user?: AuthenticatedUser,
  ) {
    const qb = this.requestRepo
      .createQueryBuilder('tr')
      .leftJoinAndSelect('tr.subjects', 'subject')
      .leftJoinAndSelect('tr.curriculum', 'curriculum')
      .leftJoinAndSelect('tr.educationLevel', 'educationLevel')
      .leftJoinAndSelect('tr.stream', 'stream')
      .where('tr.status IN (:...statuses)', { statuses: ['open', 'matched'] });

    if (query.district) {
      qb.andWhere('LOWER(tr.district) = LOWER(:district)', { district: query.district });
    }
    if (query.area) {
      qb.andWhere('LOWER(tr.area) LIKE LOWER(:area)', { area: `%${query.area}%` });
    }
    if (query.learningMode) {
      qb.andWhere('tr.learningMode = :mode', { mode: query.learningMode });
    }
    if (query.search) {
      qb.andWhere(
        '(LOWER(tr.studentName) LIKE LOWER(:s) OR LOWER(tr.institutionName) LIKE LOWER(:s) OR LOWER(tr.requirementsNotes) LIKE LOWER(:s))',
        { s: `%${query.search}%` },
      );
    }

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    qb.orderBy('tr.isVip', 'DESC')
      .addOrderBy('tr.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    // Check application status for current tutor
    let appliedRequestIds = new Set<string>();
    if (user) {
      const myApps = await this.appRepo.find({
        where: { tutorUserId: user.id },
        select: { requestId: true },
      });
      appliedRequestIds = new Set(myApps.map((a) => a.requestId));
    }

    const data = items.map((item) => ({
      ...item,
      addressDetails: null, // Always mask address on public job board
      hasApplied: appliedRequestIds.has(item.id),
    }));

    return {
      items: data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 5. Tutor applies for an open Tuition Request
   */
  async applyForTuition(
    requestId: string,
    user: AuthenticatedUser,
    dto: ApplyTuitionRequestDto,
  ): Promise<TuitionRequestApplicationEntity> {
    const request = await this.requestRepo.findOne({ where: { id: requestId } });
    if (!request) {
      throw new NotFoundException('Tuition request not found');
    }
    if (request.status !== 'open' && request.status !== 'matched') {
      throw new BadRequestException('This tuition request is no longer accepting applications');
    }

    const existing = await this.appRepo.findOne({
      where: { requestId, tutorUserId: user.id },
    });
    if (existing) {
      throw new ConflictException('You have already applied for this tuition request');
    }

    const application = this.appRepo.create({
      requestId,
      tutorUserId: user.id,
      coverPitch: dto.coverPitch.trim(),
      proposedSalary: dto.proposedSalary || null,
      availableDays: dto.availableDays || [],
      status: 'pending',
    });

    const saved = await this.appRepo.save(application);
    this.logger.log(`Tutor ${user.id} applied for tuition request ${requestId}`);
    return saved;
  }

  /**
   * 6. Tutor views their submitted applications
   */
  async getTutorApplications(user: AuthenticatedUser): Promise<TuitionRequestApplicationEntity[]> {
    return this.appRepo.find({
      where: { tutorUserId: user.id },
      relations: {
        request: {
          subjects: true,
          curriculum: true,
          educationLevel: true,
        },
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 7. Admin views all requests with pagination and filters
   */
  async getAdminRequests(query: GetTuitionRequestsQueryDto) {
    const qb = this.requestRepo
      .createQueryBuilder('tr')
      .leftJoinAndSelect('tr.guardianUser', 'guardian')
      .leftJoinAndSelect('tr.subjects', 'subject')
      .leftJoinAndSelect('tr.curriculum', 'curriculum')
      .leftJoinAndSelect('tr.educationLevel', 'educationLevel')
      .leftJoinAndSelect('tr.stream', 'stream')
      .leftJoinAndSelect('tr.assignedTutor', 'assignedTutor')
      .leftJoinAndSelect('assignedTutor.user', 'assignedUser')
      .leftJoinAndSelect('tr.suggestions', 'suggestion')
      .leftJoinAndSelect('tr.applications', 'application');

    if (query.status && query.status !== 'all') {
      qb.andWhere('tr.status = :status', { status: query.status });
    }
    if (query.learningMode) {
      qb.andWhere('tr.learningMode = :mode', { mode: query.learningMode });
    }
    if (query.district) {
      qb.andWhere('LOWER(tr.district) = LOWER(:district)', { district: query.district });
    }
    if (query.search) {
      qb.andWhere(
        '(LOWER(tr.requestReference) LIKE LOWER(:s) OR LOWER(tr.studentName) LIKE LOWER(:s) OR LOWER(guardian.displayName) LIKE LOWER(:s) OR LOWER(tr.district) LIKE LOWER(:s))',
        { s: `%${query.search}%` },
      );
    }

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;

    qb.orderBy('tr.isVip', 'DESC')
      .addOrderBy('tr.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 8. Smart Matching Algorithm for Admin:
   * Calculates 0-100% match score for registered verified tutors against a request
   */
  async getMatchCandidates(requestId: string) {
    const request = await this.requestRepo.findOne({
      where: { id: requestId },
      relations: { subjects: true, curriculum: true, educationLevel: true },
    });

    if (!request) {
      throw new NotFoundException('Tuition request not found');
    }

    const requestSubjectIds = request.subjects?.map((s) => s.id) || [];
    const isOnline = request.learningMode === 'online';

    // Fetch all platform tutors so admin can inspect and suggest anyone
    const tutors = await this.tutorRepo.find({
      relations: {
        user: true,
        subjects: true,
        serviceAreas: true,
        qualifications: true,
      },
      order: { createdAt: 'DESC' },
    });

    const candidates = [];

    for (const tutor of tutors) {
      // Don't suggest the guardian as their own tutor if they happen to have a tutor profile
      if (tutor.userId === request.guardianUserId) {
        continue;
      }

      let score = 30; // base platform educator score
      const breakdown: string[] = ['Platform educator baseline (+30)'];

      // Verification / Published status (+15)
      if (tutor.publicationStatus === 'published' || tutor.verificationStatus === 'approved') {
        score += 15;
        breakdown.push('Verified & published educator (+15)');
      }

      // 1. Subject competency match (up to +30)
      const tutorSubIds = (tutor.subjects || []).map((s) => s.subjectId);
      const matchedSubjects = requestSubjectIds.filter((id) => tutorSubIds.includes(id));
      if (requestSubjectIds.length > 0 && matchedSubjects.length > 0) {
        const subRatio = matchedSubjects.length / requestSubjectIds.length;
        const subPoints = Math.round(subRatio * 30);
        score += subPoints;
        breakdown.push(`Subject match: ${matchedSubjects.length}/${requestSubjectIds.length} (+${subPoints})`);
      }

      // 2. Education level match (up to +15)
      if (request.educationLevelId) {
        const hasLevel = (tutor.subjects || []).some(
          (s) => s.educationLevelId === request.educationLevelId,
        );
        if (hasLevel) {
          score += 15;
          breakdown.push('Level match (+15)');
        }
      }

      // 3. Location match for In-Person (up to +20)
      if (!isOnline && request.district) {
        const areas = tutor.serviceAreas || [];
        const preferredAreas = tutor.preferredAreas || [];
        const hasDistrict =
          (tutor.district && tutor.district.toLowerCase() === request.district.toLowerCase()) ||
          areas.some((a) => a.districtCode.toLowerCase() === request.district!.toLowerCase());

        const hasArea =
          request.area &&
          (preferredAreas.some((p) => p.toLowerCase().includes(request.area!.toLowerCase())) ||
            areas.some((a) => a.localityName && a.localityName.toLowerCase().includes(request.area!.toLowerCase())));

        if (hasArea) {
          score += 20;
          breakdown.push(`Area match in ${request.area} (+20)`);
        } else if (hasDistrict) {
          score += 15;
          breakdown.push(`District coverage in ${request.district} (+15)`);
        }
      } else if (isOnline) {
        // Online teaching mode supported
        if ((tutor.teachingModes || []).includes('online')) {
          score += 15;
          breakdown.push('Online classroom ready (+15)');
        }
      }

      // 4. Gender match
      if (request.preferredTutorGender && request.preferredTutorGender !== 'any') {
        const tutorGender = tutor.gender || 'male';
        if (tutorGender === request.preferredTutorGender) {
          score += 10;
          breakdown.push(`Gender preference match: ${request.preferredTutorGender} (+10)`);
        } else {
          score = Math.max(score - 15, 10);
          breakdown.push(`Gender preference mismatch: requested ${request.preferredTutorGender} (-15)`);
        }
      }

      // 5. Preferred background match (up to +10)
      if (request.preferredTutorBackground) {
        const bg = request.preferredTutorBackground.toLowerCase();
        const quals = (tutor.qualifications || []).map((q) => `${q.institution} ${q.title}`.toLowerCase()).join(' ');
        if (quals.includes(bg) || (tutor.headlineEn && tutor.headlineEn.toLowerCase().includes(bg))) {
          score += 10;
          breakdown.push(`Preferred background match: ${request.preferredTutorBackground} (+10)`);
        }
      }

      // 6. Experience bonus (up to +5)
      if (tutor.yearsExperience && tutor.yearsExperience >= 2) {
        score += 5;
        breakdown.push(`Experienced educator: ${tutor.yearsExperience} yrs (+5)`);
      }

      // Cap at 99% max, floor at 15%
      const finalScore = Math.max(15, Math.min(score, 99));

      candidates.push({
        tutorUserId: tutor.userId,
        tutorCode: tutor.tutorCode,
        tutorName: tutor.user?.displayName || 'Tutor',
        avatarUrl: tutor.user?.avatarUrl,
        gender: tutor.gender || 'male',
        district: tutor.district || (tutor.serviceAreas?.[0]?.districtCode ?? 'Dhaka'),
        preferredAreas: tutor.preferredAreas || [],
        publicationStatus: tutor.publicationStatus,
        verificationStatus: tutor.verificationStatus,
        headline: tutor.headlineEn || tutor.headlineBn,
        hourlyRate: tutor.hourlyRateMinor,
        yearsExperience: tutor.yearsExperience,
        teachingModes: tutor.teachingModes,
        qualifications: (tutor.qualifications || [])
          .map((q) => `${q.institution ? q.institution + ' - ' : ''}${q.title}`)
          .filter(Boolean),
        matchScore: finalScore,
        matchBreakdown: breakdown,
      });
    }

    candidates.sort((a, b) => b.matchScore - a.matchScore);
    return candidates;
  }

  /**
   * 9. Admin suggests a tutor to the guardian
   */
  async suggestTutor(
    requestId: string,
    adminUser: AuthenticatedUser,
    dto: SuggestTutorsDto,
  ): Promise<TuitionRequestSuggestionEntity> {
    const request = await this.requestRepo.findOne({ where: { id: requestId } });
    if (!request) {
      throw new NotFoundException('Tuition request not found');
    }

    const tutor = await this.tutorRepo.findOne({ where: { userId: dto.tutorUserId } });
    if (!tutor) {
      throw new NotFoundException('Tutor profile not found');
    }

    let suggestion = await this.suggestionRepo.findOne({
      where: { requestId, tutorUserId: dto.tutorUserId },
    });

    if (suggestion) {
      suggestion.matchScore = dto.matchScore || suggestion.matchScore;
      suggestion.adminNote = dto.adminNote || suggestion.adminNote;
      suggestion.suggestedByUserId = adminUser.id;
      suggestion.status = 'suggested';
    } else {
      suggestion = this.suggestionRepo.create({
        requestId,
        tutorUserId: dto.tutorUserId,
        suggestedByUserId: adminUser.id,
        matchScore: dto.matchScore || 90,
        adminNote: dto.adminNote || 'Platform verified recommendation',
        status: 'suggested',
      });
    }

    const saved = await this.suggestionRepo.save(suggestion);

    if (request.status === 'open') {
      request.status = 'matched';
      await this.requestRepo.save(request);
    }

    this.logger.log(`Admin ${adminUser.id} suggested tutor ${dto.tutorUserId} for request ${requestId}`);
    return saved;
  }

  /**
   * 10. Guardian responds to suggestion (accept / decline / demo)
   */
  async respondToSuggestion(
    suggestionId: string,
    user: AuthenticatedUser,
    dto: RespondSuggestionDto,
  ): Promise<TuitionRequestSuggestionEntity> {
    const suggestion = await this.suggestionRepo.findOne({
      where: { id: suggestionId },
      relations: { request: true },
    });

    if (!suggestion || !suggestion.request) {
      throw new NotFoundException('Suggestion not found');
    }

    if (suggestion.request.guardianUserId !== user.id && !isAdminRole(user)) {
      throw new ForbiddenException('You cannot respond to suggestions for this request');
    }

    if (dto.action === 'accept') {
      suggestion.status = 'accepted_by_guardian';
      suggestion.request.assignedTutorUserId = suggestion.tutorUserId;
      suggestion.request.status = 'confirmed';
      await this.requestRepo.save(suggestion.request);
    } else if (dto.action === 'request_demo') {
      suggestion.status = 'demo_scheduled';
      suggestion.request.assignedTutorUserId = suggestion.tutorUserId;
      suggestion.request.status = 'demo_scheduled';
      await this.requestRepo.save(suggestion.request);
    } else if (dto.action === 'decline') {
      suggestion.status = 'declined_by_guardian';
    }

    if (dto.feedback) {
      suggestion.guardianFeedback = dto.feedback.trim();
    }

    return this.suggestionRepo.save(suggestion);
  }

  /**
   * 11. Guardian cancels their request
   */
  async cancelRequest(requestId: string, user: AuthenticatedUser): Promise<TuitionRequestEntity> {
    const request = await this.requestRepo.findOne({ where: { id: requestId } });
    if (!request) {
      throw new NotFoundException('Tuition request not found');
    }

    if (request.guardianUserId !== user.id && !isAdminRole(user)) {
      throw new ForbiddenException('You cannot cancel this request');
    }

    request.status = 'cancelled';
    return this.requestRepo.save(request);
  }

  /**
   * 12. Admin updates request status
   */
  async updateStatus(
    requestId: string,
    status: TuitionRequestStatus,
    adminUser: AuthenticatedUser,
  ): Promise<TuitionRequestEntity> {
    const request = await this.requestRepo.findOne({ where: { id: requestId } });
    if (!request) {
      throw new NotFoundException('Tuition request not found');
    }

    request.status = status;
    const saved = await this.requestRepo.save(request);
    this.logger.log(`Admin ${adminUser.id} updated status of request ${requestId} to ${status}`);
    return saved;
  }
}
