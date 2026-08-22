// skilllink-backend/src/marketplace/dto/create-listing.dto.ts
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateListingDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  bio: string;

  // Stored as standard integer cents (e.g. 150000 = ₦1,500)
  @IsInt()
  @Min(0)
  hourlyRateCents: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  skills: string[]; // e.g. ["Database Security", "TS"]
}
