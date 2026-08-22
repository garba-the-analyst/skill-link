// skilllink-backend/src/auth/dto/profile-toggle.dto.ts
import { IsBoolean } from 'class-validator';

export class ProfileToggleDto {
  @IsBoolean()
  isPaidProvider: boolean;

  @IsBoolean()
  isVolunteer: boolean;
}
