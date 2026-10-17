import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubjectEntity } from './entities/subject.entity';
import { EducationLevelEntity } from './entities/education-level.entity';
import { CurriculumEntity } from './entities/curriculum.entity';
import { StreamEntity } from './entities/stream.entity';
import { InstitutionEntity } from './entities/institution.entity';
import { TaxonomyController } from './taxonomy.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SubjectEntity,
      EducationLevelEntity,
      CurriculumEntity,
      StreamEntity,
      InstitutionEntity,
    ]),
  ],
  controllers: [TaxonomyController],
  exports: [TypeOrmModule],
})
export class TaxonomyModule {}
