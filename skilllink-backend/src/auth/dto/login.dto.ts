// skilllink-backend/src/auth/dto/login.dto.ts
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email: string;

  // Plaintext password to evaluate against the stored bcrypt hash.
  @IsString()
  password: string;
}
