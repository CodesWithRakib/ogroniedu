import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubjectEntity } from './entities/subject.entity';
import { EducationLevelEntity } from './entities/education-level.entity';
import { CurriculumEntity } from './entities/curriculum.entity';

@Controller('api/v1/taxonomy')
export class TaxonomyController {
  constructor(
    @InjectRepository(SubjectEntity)
    private readonly subjectRepo: Repository<SubjectEntity>,
    @InjectRepository(EducationLevelEntity)
    private readonly levelRepo: Repository<EducationLevelEntity>,
    @InjectRepository(CurriculumEntity)
    private readonly curriculumRepo: Repository<CurriculumEntity>,
  ) {}

  @Get('subjects')
  async getSubjects() {
    const data = await this.subjectRepo.find({
      where: { isActive: true },
      order: { nameEn: 'ASC' },
    });
    return { success: true, data };
  }

  @Get('education-levels')
  async getEducationLevels() {
    const data = await this.levelRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
    return { success: true, data };
  }

  @Get('curricula')
  async getCurricula() {
    const data = await this.curriculumRepo.find({
      where: { isActive: true },
      order: { code: 'ASC' },
    });
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
}
