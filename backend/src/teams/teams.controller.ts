import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { UpdateTeamStatusDto } from './dto/update-team-status.dto';
import { QueryTeamDto } from './dto/query-team.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  /**
   * POST /api/teams
   * Create a response team. Requires Admin authentication.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createTeamDto: CreateTeamDto) {
    return this.teamsService.createTeam(createTeamDto);
  }

  /**
   * GET /api/teams
   * List teams with filters, search and pagination. Requires Admin authentication.
   */
  @Get()
  findAll(@Query() query: QueryTeamDto) {
    return this.teamsService.findAll(query);
  }

  /**
   * GET /api/teams/:id
   * Retrieve a single team with complete assignment history. Requires Admin authentication.
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teamsService.findOne(id);
  }

  /**
   * PATCH /api/teams/:id
   * Update team details. Requires Admin authentication.
   */
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTeamDto: UpdateTeamDto) {
    return this.teamsService.updateTeam(id, updateTeamDto);
  }

  /**
   * PATCH /api/teams/:id/status
   * Update team availability with business rule enforcement. Requires Admin authentication.
   */
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateTeamStatusDto: UpdateTeamStatusDto,
  ) {
    return this.teamsService.updateStatus(id, updateTeamStatusDto);
  }

  /**
   * DELETE /api/teams/:id
   * Safe deletion preventing removal of teams with assignment history. Requires Admin authentication.
   */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.teamsService.remove(id);
  }
}
