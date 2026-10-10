import { IsString, IsNotEmpty, IsOptional, MaxLength, Equals } from 'class-validator';

export class DeleteAccountDto {
  @IsString()
  @IsNotEmpty()
  @Equals('DELETE', { message: 'confirmationText must be exactly "DELETE"' })
  confirmationText!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
