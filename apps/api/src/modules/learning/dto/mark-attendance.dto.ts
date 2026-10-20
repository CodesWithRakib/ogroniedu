import { IsUUID, IsNotEmpty, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { AttendanceStatus } from '../entities/session-attendance.entity';

export class MarkAttendanceDto {
  @IsUUID()
  @IsNotEmpty()
  sessionId!: string;

  @IsUUID()
  @IsNotEmpty()
  participantUserId!: string;

  @IsIn(['present', 'late', 'absent', 'excused'], {
    message: 'attendanceStatus must be present, late, absent, or excused',
  })
  attendanceStatus!: AttendanceStatus;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  notes?: string;

  /** Required when overwriting an existing attendance record. */
  @IsString()
  @MaxLength(500)
  @IsOptional()
  correctionReason?: string;
}
