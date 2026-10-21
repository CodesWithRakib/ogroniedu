import { IsIn, IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export const ExportReportTypes = [
  'users',
  'bookings',
  'financial',
  'tutors',
  'organizations',
] as const;
export type ExportReportType = (typeof ExportReportTypes)[number];

export class ExportReportDto {
  @IsIn(ExportReportTypes)
  reportType!: ExportReportType;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  limit = 1000;
}
