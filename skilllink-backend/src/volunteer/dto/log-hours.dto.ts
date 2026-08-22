// skilllink-backend/src/volunteer/dto/log-hours.dto.ts
import { IsInt, IsString, Max, Min } from 'class-validator';

export class LogHoursDto {
  @IsString()
  opportunityId: string;

  @IsInt()
  @Min(1)
  @Max(24) // a single log entry can't exceed a full day
  hours: number;
}
