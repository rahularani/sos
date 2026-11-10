import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class AssignTeamDto {
  @IsNotEmpty({ message: 'teamId is required to dispatch a response team.' })
  @IsString()
  teamId: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  assignedBy?: string;
}
