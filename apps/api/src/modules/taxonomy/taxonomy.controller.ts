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
}
