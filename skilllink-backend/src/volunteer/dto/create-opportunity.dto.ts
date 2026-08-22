// skilllink-backend/src/volunteer/dto/create-opportunity.dto.ts
import { IsInt, IsString, Min, MaxLength, MinLength } from 'class-validator';

export class CreateOpportunityDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @IsString()
  category: string; // e.g. "Environmental", "Education"

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  location: string;

  @IsInt()
  @Min(1)
  requiredHours: number;
}
