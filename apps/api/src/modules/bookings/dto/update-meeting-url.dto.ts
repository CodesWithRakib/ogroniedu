import { IsNotEmpty, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateMeetingUrlDto {
  @IsNotEmpty()
  @IsString()
  @IsUrl()
  @MaxLength(500)
  meetingUrl!: string;
}
