import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class UpdateAssignmentStatusDto {
  @IsNotEmpty({ message: 'status is required.' })
  @IsString()
  status: string; // 'ASSIGNED' | 'EN_ROUTE' | 'ON_SCENE' | 'COMPLETED' | 'CANCELLED'

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  updatedBy?: string;
}
