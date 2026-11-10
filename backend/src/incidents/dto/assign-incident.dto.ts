import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class AssignIncidentDto {
  @IsNotEmpty({ message: 'teamId is required to dispatch an emergency response team.' })
  @IsString()
  teamId: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  assignedBy?: string;
}
