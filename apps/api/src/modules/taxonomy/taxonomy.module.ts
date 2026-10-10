import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubjectEntity } from './entities/subject.entity';
import { EducationLevelEntity } from './entities/education-level.entity';
import { CurriculumEntity } from './entities/curriculum.entity';
import { TaxonomyController } from './taxonomy.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SubjectEntity, EducationLevelEntity, CurriculumEntity])],
  controllers: [TaxonomyController],
  exports: [TypeOrmModule],
})
export class TaxonomyModule {}
