// skilllink-backend/src/escrow/dto/release-escrow.dto.ts
import { IsNumberString, Length } from 'class-validator';

export class ReleaseEscrowDto {
  // The 6-digit confirmation code the provider shared after marking the job complete.
  @IsNumberString()
  @Length(6, 6, { message: 'The confirmation code must be exactly 6 digits.' })
  otp: string;
}
