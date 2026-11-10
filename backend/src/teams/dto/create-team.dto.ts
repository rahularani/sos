import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class CreateTeamDto {
  @IsNotEmpty({ message: 'Team name is required.' })
  @IsString()
  @MaxLength(100, { message: 'Team name must not exceed 100 characters.' })
  name: string;

  @IsNotEmpty({ message: 'Response category is required.' })
  @IsString()
  category: string;

  @IsNotEmpty({ message: 'Latitude is required.' })
  @IsNumber({}, { message: 'Latitude must be a valid number.' })
  @Min(-90, { message: 'Latitude must be between -90 and 90 degrees.' })
  @Max(90, { message: 'Latitude must be between -90 and 90 degrees.' })
  latitude: number;

  @IsNotEmpty({ message: 'Longitude is required.' })
  @IsNumber({}, { message: 'Longitude must be a valid number.' })
  @Min(-180, { message: 'Longitude must be between -180 and 180 degrees.' })
  @Max(180, { message: 'Longitude must be between -180 and 180 degrees.' })
  longitude: number;

  @IsOptional()
  @IsString()
  @MaxLength(30, { message: 'Contact phone must not exceed 30 characters.' })
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Notes must not exceed 500 characters.' })
  notes?: string;
}
