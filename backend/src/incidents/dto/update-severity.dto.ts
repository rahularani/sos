import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class UpdateSeverityDto {
  @IsNotEmpty({ message: 'Severity value is required.' })
  @IsString()
  severity: string; // 'Low' | 'Medium' | 'High' | 'Critical'

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  updatedBy?: string;
}
