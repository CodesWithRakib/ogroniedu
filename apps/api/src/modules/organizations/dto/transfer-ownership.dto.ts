import { IsUUID, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';

export class TransferOwnershipDto {
  @IsUUID()
  newOwnerUserId!: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason?: string;
}
