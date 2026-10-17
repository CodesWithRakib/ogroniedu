import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  NotFoundException,
  ConflictException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ADMIN_ROLES } from '../../common/auth/role.utils';
import { SubjectEntity } from './entities/subject.entity';
import { EducationLevelEntity } from './entities/education-level.entity';
import { CurriculumEntity } from './entities/curriculum.entity';
import { StreamEntity } from './entities/stream.entity';
import { InstitutionEntity } from './entities/institution.entity';
import {
  CreateEducationLevelDto,
  UpdateEducationLevelDto,
  CreateCurriculumDto,
  UpdateCurriculumDto,
  CreateStreamDto,
  UpdateStreamDto,
  CreateInstitutionDto,
  UpdateInstitutionDto,
  CreateSubjectDto,
  UpdateSubjectDto,
} from './dto/taxonomy-manage.dto';

@Controller('api/v1/taxonomy')
export class TaxonomyController {
  constructor(
    @InjectRepository(SubjectEntity)
    private readonly subjectRepo: Repository<SubjectEntity>,
    @InjectRepository(EducationLevelEntity)
    private readonly levelRepo: Repository<EducationLevelEntity>,
    @InjectRepository(CurriculumEntity)
    private readonly curriculumRepo: Repository<CurriculumEntity>,
    @InjectRepository(StreamEntity)
    private readonly streamRepo: Repository<StreamEntity>,
    @InjectRepository(InstitutionEntity)
    private readonly institutionRepo: Repository<InstitutionEntity>,
  ) {}

  /* ============================================================================
   * 1. Public Read Endpoints for Dynamic Dropdowns and Search
   * ========================================================================= */

  @Get('subjects')
  async getSubjects(@Query('all') all?: string) {
    const where = all === 'true' ? {} : { isActive: true };
    const data = await this.subjectRepo.find({
      where,
      order: { nameEn: 'ASC' },
    });
    return { success: true, data };
  }

  @Get('education-levels')
  async getEducationLevels(@Query('all') all?: string) {
    const where = all === 'true' ? {} : { isActive: true };
    const data = await this.levelRepo.find({
      where,
      order: { sortOrder: 'ASC' },
    });
    return { success: true, data };
  }

  @Get('curricula')
  async getCurricula(@Query('all') all?: string) {
    const where = all === 'true' ? {} : { isActive: true };
    const data = await this.curriculumRepo.find({
      where,
      order: { code: 'ASC' },
    });
    return { success: true, data };
  }

  @Get('streams')
  async getStreams(@Query('all') all?: string) {
    const where = all === 'true' ? {} : { isActive: true };
    const data = await this.streamRepo.find({
      where,
      order: { sortOrder: 'ASC' },
    });
    return { success: true, data };
  }

  @Get('institutions')
  async getInstitutions(
    @Query('all') all?: string,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('district') district?: string,
    @Query('limit') limitStr?: string,
  ) {
    const limit = Math.min(Number(limitStr) || 100, 200);
    const qb = this.institutionRepo.createQueryBuilder('inst');
    if (all !== 'true') {
      qb.where('inst.isActive = :active', { active: true });
    }

    if (type) {
      qb.andWhere('inst.type = :type', { type });
    }

    if (district) {
      qb.andWhere('inst.district ILIKE :district', { district: `%${district}%` });
    }

    if (search && search.trim()) {
      qb.andWhere(
        '(inst.nameEn ILIKE :search OR inst.nameBn ILIKE :search OR inst.code ILIKE :search)',
        {
          search: `%${search.trim()}%`,
        },
      );
    }

    qb.orderBy('inst.sortOrder', 'ASC').addOrderBy('inst.nameEn', 'ASC').take(limit);

    const data = await qb.getMany();
    return { success: true, data };
  }

  @Get('locations')
  async getLocations() {
    const data = [
      { code: 'dhaka', nameEn: 'Dhaka', nameBn: 'ঢাকা', division: 'Dhaka' },
      { code: 'chittagong', nameEn: 'Chattogram', nameBn: 'চট্টগ্রাম', division: 'Chattogram' },
      { code: 'sylhet', nameEn: 'Sylhet', nameBn: 'সিলেট', division: 'Sylhet' },
      { code: 'rajshahi', nameEn: 'Rajshahi', nameBn: 'রাজশাহী', division: 'Rajshahi' },
      { code: 'khulna', nameEn: 'Khulna', nameBn: 'খুলনা', division: 'Khulna' },
      { code: 'barishal', nameEn: 'Barishal', nameBn: 'বরিশাল', division: 'Barishal' },
      { code: 'rangpur', nameEn: 'Rangpur', nameBn: 'রংপুর', division: 'Rangpur' },
      { code: 'mymensingh', nameEn: 'Mymensingh', nameBn: 'ময়মনসিংহ', division: 'Mymensingh' },
      { code: 'comilla', nameEn: 'Cumilla', nameBn: 'কুমিল্লা', division: 'Chattogram' },
      { code: 'gazipur', nameEn: 'Gazipur', nameBn: 'গাজীপুর', division: 'Dhaka' },
      { code: 'narayanganj', nameEn: 'Narayanganj', nameBn: 'নারায়ণগঞ্জ', division: 'Dhaka' },
      { code: 'bogra', nameEn: 'Bogura', nameBn: 'বগুড়া', division: 'Rajshahi' },
    ];
    return { success: true, data };
  }

  /* ============================================================================
   * 2. Admin Management Endpoints (CRUD)
   * ========================================================================= */

  // --- Education Levels Management ---
  @Post('education-levels')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES)
  @HttpCode(HttpStatus.CREATED)
  async createEducationLevel(@Body() dto: CreateEducationLevelDto) {
    const existing = await this.levelRepo.findOne({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`Education level code '${dto.code}' already exists`);

    const level = this.levelRepo.create({
      code: dto.code,
      nameEn: dto.nameEn,
      nameBn: dto.nameBn,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
    });
    const saved = await this.levelRepo.save(level);
    return { success: true, data: saved };
  }

  @Patch('education-levels/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES)
  async updateEducationLevel(@Param('id') id: string, @Body() dto: UpdateEducationLevelDto) {
    const level = await this.levelRepo.findOne({ where: { id } });
    if (!level) throw new NotFoundException(`Education level ${id} not found`);

    if (dto.nameEn !== undefined) level.nameEn = dto.nameEn;
    if (dto.nameBn !== undefined) level.nameBn = dto.nameBn;
    if (dto.sortOrder !== undefined) level.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) level.isActive = dto.isActive;

    const saved = await this.levelRepo.save(level);
    return { success: true, data: saved };
  }

  @Delete('education-levels/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES)
  async deleteEducationLevel(@Param('id') id: string) {
    const level = await this.levelRepo.findOne({ where: { id } });
    if (!level) throw new NotFoundException(`Education level ${id} not found`);

    level.isActive = false;
    await this.levelRepo.save(level);
    return { success: true, message: 'Education level deactivated' };
  }

  // --- Curricula Management ---
  @Post('curricula')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES)
  @HttpCode(HttpStatus.CREATED)
  async createCurriculum(@Body() dto: CreateCurriculumDto) {
    const existing = await this.curriculumRepo.findOne({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`Curriculum code '${dto.code}' already exists`);

    const curriculum = this.curriculumRepo.create({
      code: dto.code,
      nameEn: dto.nameEn,
      nameBn: dto.nameBn,
      boardName: dto.boardName ?? null,
      isActive: dto.isActive ?? true,
    });
    const saved = await this.curriculumRepo.save(curriculum);
    return { success: true, data: saved };
  }

  @Patch('curricula/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES)
  async updateCurriculum(@Param('id') id: string, @Body() dto: UpdateCurriculumDto) {
    const curriculum = await this.curriculumRepo.findOne({ where: { id } });
    if (!curriculum) throw new NotFoundException(`Curriculum ${id} not found`);

    if (dto.nameEn !== undefined) curriculum.nameEn = dto.nameEn;
    if (dto.nameBn !== undefined) curriculum.nameBn = dto.nameBn;
    if (dto.boardName !== undefined) curriculum.boardName = dto.boardName;
    if (dto.isActive !== undefined) curriculum.isActive = dto.isActive;

    const saved = await this.curriculumRepo.save(curriculum);
    return { success: true, data: saved };
  }

  @Delete('curricula/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES)
  async deleteCurriculum(@Param('id') id: string) {
    const curriculum = await this.curriculumRepo.findOne({ where: { id } });
    if (!curriculum) throw new NotFoundException(`Curriculum ${id} not found`);

    curriculum.isActive = false;
    await this.curriculumRepo.save(curriculum);
    return { success: true, message: 'Curriculum deactivated' };
  }

  // --- Streams Management ---
  @Post('streams')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES)
  @HttpCode(HttpStatus.CREATED)
  async createStream(@Body() dto: CreateStreamDto) {
    const existing = await this.streamRepo.findOne({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`Stream code '${dto.code}' already exists`);

    const stream = this.streamRepo.create({
      code: dto.code,
      nameEn: dto.nameEn,
      nameBn: dto.nameBn,
      description: dto.description ?? null,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
    });
    const saved = await this.streamRepo.save(stream);
    return { success: true, data: saved };
  }

  @Patch('streams/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES)
  async updateStream(@Param('id') id: string, @Body() dto: UpdateStreamDto) {
    const stream = await this.streamRepo.findOne({ where: { id } });
    if (!stream) throw new NotFoundException(`Stream ${id} not found`);

    if (dto.nameEn !== undefined) stream.nameEn = dto.nameEn;
    if (dto.nameBn !== undefined) stream.nameBn = dto.nameBn;
    if (dto.description !== undefined) stream.description = dto.description;
    if (dto.sortOrder !== undefined) stream.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) stream.isActive = dto.isActive;

    const saved = await this.streamRepo.save(stream);
    return { success: true, data: saved };
  }

  @Delete('streams/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES)
  async deleteStream(@Param('id') id: string) {
    const stream = await this.streamRepo.findOne({ where: { id } });
    if (!stream) throw new NotFoundException(`Stream ${id} not found`);

    stream.isActive = false;
    await this.streamRepo.save(stream);
    return { success: true, message: 'Stream deactivated' };
  }

  // --- Institutions Management ---
  @Post('institutions')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES)
  @HttpCode(HttpStatus.CREATED)
  async createInstitution(@Body() dto: CreateInstitutionDto) {
    const existing = await this.institutionRepo.findOne({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`Institution code '${dto.code}' already exists`);

    const inst = this.institutionRepo.create({
      code: dto.code,
      nameEn: dto.nameEn,
      nameBn: dto.nameBn,
      type: dto.type ?? 'school_and_college',
      district: dto.district ?? null,
      division: dto.division ?? null,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
    });
    const saved = await this.institutionRepo.save(inst);
    return { success: true, data: saved };
  }

  @Patch('institutions/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES)
  async updateInstitution(@Param('id') id: string, @Body() dto: UpdateInstitutionDto) {
    const inst = await this.institutionRepo.findOne({ where: { id } });
    if (!inst) throw new NotFoundException(`Institution ${id} not found`);

    if (dto.nameEn !== undefined) inst.nameEn = dto.nameEn;
    if (dto.nameBn !== undefined) inst.nameBn = dto.nameBn;
    if (dto.type !== undefined) inst.type = dto.type;
    if (dto.district !== undefined) inst.district = dto.district;
    if (dto.division !== undefined) inst.division = dto.division;
    if (dto.sortOrder !== undefined) inst.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) inst.isActive = dto.isActive;

    const saved = await this.institutionRepo.save(inst);
    return { success: true, data: saved };
  }

  @Delete('institutions/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES)
  async deleteInstitution(@Param('id') id: string) {
    const inst = await this.institutionRepo.findOne({ where: { id } });
    if (!inst) throw new NotFoundException(`Institution ${id} not found`);

    inst.isActive = false;
    await this.institutionRepo.save(inst);
    return { success: true, message: 'Institution deactivated' };
  }

  // --- Subjects Management ---
  @Post('subjects')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES)
  @HttpCode(HttpStatus.CREATED)
  async createSubject(@Body() dto: CreateSubjectDto) {
    const existing = await this.subjectRepo.findOne({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`Subject code '${dto.code}' already exists`);

    const subj = this.subjectRepo.create({
      code: dto.code,
      nameEn: dto.nameEn,
      nameBn: dto.nameBn,
      category: dto.category ?? 'academic',
      isActive: dto.isActive ?? true,
    });
    const saved = await this.subjectRepo.save(subj);
    return { success: true, data: saved };
  }

  @Patch('subjects/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES)
  async updateSubject(@Param('id') id: string, @Body() dto: UpdateSubjectDto) {
    const subj = await this.subjectRepo.findOne({ where: { id } });
    if (!subj) throw new NotFoundException(`Subject ${id} not found`);

    if (dto.nameEn !== undefined) subj.nameEn = dto.nameEn;
    if (dto.nameBn !== undefined) subj.nameBn = dto.nameBn;
    if (dto.category !== undefined) subj.category = dto.category;
    if (dto.isActive !== undefined) subj.isActive = dto.isActive;

    const saved = await this.subjectRepo.save(subj);
    return { success: true, data: saved };
  }

  @Delete('subjects/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES)
  async deleteSubject(@Param('id') id: string) {
    const subj = await this.subjectRepo.findOne({ where: { id } });
    if (!subj) throw new NotFoundException(`Subject ${id} not found`);

    subj.isActive = false;
    await this.subjectRepo.save(subj);
    return { success: true, message: 'Subject deactivated' };
  }
}
