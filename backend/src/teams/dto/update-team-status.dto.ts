import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateTeamStatusDto {
  @IsNotEmpty({ message: 'Status is required.' })
  @IsString()
  status: string;
}
