import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { SUPPORT_TICKET_CATEGORIES } from '../enums/support-ticket-category.enum';

export class CreateSupportTicketDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  name!: string;

  @IsEmail()
  @IsNotEmpty()
  @Length(5, 160)
  email!: string;

  @IsOptional()
  @IsString()
  @Length(6, 20)
  phone?: string;

  @IsOptional()
  @IsIn([...SUPPORT_TICKET_CATEGORIES])
  category?: string = 'general';

  @IsString()
  @IsNotEmpty()
  @Length(10, 2000)
  message!: string;
}

/** Normalized phone: keep digits and a single leading + only. */
export function normalizeTicketPhone(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  const cleaned = raw
    .trim()
    .replace(/(?!^)\+/g, '')
    .replace(/[^\d+]/g, '');
  return cleaned === '' ? null : cleaned;
}
