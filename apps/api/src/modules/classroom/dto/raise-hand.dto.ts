import { IsBoolean } from 'class-validator';

export class RaiseHandDto {
  @IsBoolean()
  isHandRaised!: boolean;
}
