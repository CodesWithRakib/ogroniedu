import { IsOptional, IsObject } from 'class-validator';

export class JoinClassroomDto {
  @IsOptional()
  @IsObject()
  deviceInfo?: Record<string, unknown>;
}
