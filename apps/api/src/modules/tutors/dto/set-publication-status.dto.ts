import { IsIn, IsNotEmpty } from 'class-validator';
import { PublicationStatus } from '../entities/tutor-profile.entity';

export class SetPublicationStatusDto {
  @IsNotEmpty()
  @IsIn(['draft', 'published', 'unpublished'])
  publicationStatus!: PublicationStatus;
}
