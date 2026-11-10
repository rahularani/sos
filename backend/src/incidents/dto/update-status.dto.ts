import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class UpdateStatusDto {
  @IsNotEmpty({ message: 'New status is required.' })
  @IsString()
  status: string; // 'Pending' | 'In Progress' | 'Resolved' | 'Reported' or enum

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  updatedBy?: string;
}
