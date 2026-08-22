// skilllink-backend/src/auth/dto/register.dto.ts
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email: string;

  // Plaintext password from the client — hashed in AuthService before storage.
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @MaxLength(72, { message: 'Password must be 72 characters or fewer.' }) // bcrypt's input limit
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  displayName: string;

  @IsOptional()
  @IsIn(['INDIVIDUAL', 'ORGANIZATION'])
  profileType?: 'INDIVIDUAL' | 'ORGANIZATION';

  @IsOptional()
  @IsBoolean()
  isPaidProvider?: boolean;

  @IsOptional()
  @IsBoolean()
  isVolunteer?: boolean;
}
