import { IsString, IsOptional, MaxLength } from 'class-validator';

export class EndClassroomDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
