import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';
import { StudentProfileEntity } from '../entities/student-profile.entity';
import { AuditService } from '../../audit/audit.service';
import { UpsertStudentProfileDto } from '../dto';

/**
 * Student profile lifecycle: upsert with existence guard + audit.
 * Extracted from UsersService (Phase 23 P1-4b) — student-domain writes live
 * here; identity reads stay in UsersService.
 */
@Injectable()
export class StudentProfileService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(StudentProfileEntity)
    private readonly studentProfileRepository: Repository<StudentProfileEntity>,
    @Inject(AuditService)
    private readonly auditService: AuditService,
  ) {}

  async upsertStudentProfile(
    userId: string,
    dto: UpsertStudentProfileDto,
  ): Promise<StudentProfileEntity> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let profile = await this.studentProfileRepository.findOne({
      where: { userId },
    });

    if (!profile) {
      profile = this.studentProfileRepository.create({
        userId,
        dateOfBirth: dto.dateOfBirth ?? null,
        educationLevelId: dto.educationLevelId ?? null,
        curriculumId: dto.curriculumId ?? null,
        institutionName: dto.institutionName ?? null,
        stream: dto.stream ?? null,
        districtCode: dto.districtCode ?? null,
        upazilaCode: dto.upazilaCode ?? null,
        learningGoals: dto.learningGoals ?? null,
        profileVisibility: dto.profileVisibility ?? 'private',
      });
    } else {
      if (dto.dateOfBirth !== undefined) profile.dateOfBirth = dto.dateOfBirth;
      if (dto.educationLevelId !== undefined) profile.educationLevelId = dto.educationLevelId;
      if (dto.curriculumId !== undefined) profile.curriculumId = dto.curriculumId;
      if (dto.institutionName !== undefined) profile.institutionName = dto.institutionName;
      if (dto.stream !== undefined) profile.stream = dto.stream;
      if (dto.districtCode !== undefined) profile.districtCode = dto.districtCode;
      if (dto.upazilaCode !== undefined) profile.upazilaCode = dto.upazilaCode;
      if (dto.learningGoals !== undefined) profile.learningGoals = dto.learningGoals;
      if (dto.profileVisibility !== undefined) profile.profileVisibility = dto.profileVisibility;
    }

    const saved = await this.studentProfileRepository.save(profile);

    await this.auditService.record({
      actorUserId: userId,
      action: 'student.profile.updated',
      resourceType: 'student_profile',
      resourceId: userId,
      safeMetadata: {
        profileVisibility: saved.profileVisibility,
      },
    });

    return saved;
  }
}
