import {
  IsNotEmpty,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class RespondSuggestionDto {
  @IsNotEmpty()
  @IsIn(['accept', 'decline', 'request_demo'])
  action!: 'accept' | 'decline' | 'request_demo';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  feedback?: string;
}
