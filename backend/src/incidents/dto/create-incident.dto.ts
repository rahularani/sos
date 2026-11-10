import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class CreateIncidentDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty({ message: 'Emergency category is required.' })
  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  peopleBracket?: string; // '1' | '2-5' | '6-10' | '10+'

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  // Location fields (nullable / optional as per spec §6.2 & §6.3)
  @IsOptional()
  @IsNumber()
  latitude?: number | null;

  @IsOptional()
  @IsNumber()
  longitude?: number | null;

  @IsOptional()
  @IsNumber()
  accuracy?: number | null;

  @IsOptional()
  @IsString()
  address?: string | null;

  @IsOptional()
  @IsDateString()
  locationTimestamp?: string | null;
}
