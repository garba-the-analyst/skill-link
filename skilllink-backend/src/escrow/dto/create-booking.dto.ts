// skilllink-backend/src/escrow/dto/create-booking.dto.ts
import { IsInt, IsString, Min } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  listingId: string;

  // Total platform session value held in escrow, in integer cents.
  @IsInt()
  @Min(100) // at least 1.00 in the listing's currency
  amountCents: number;
}
