import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IncidentsService } from './incidents.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { UpdateSeverityDto } from './dto/update-severity.dto';
import { QueryIncidentDto } from './dto/query-incident.dto';
import { AssignIncidentDto } from './dto/assign-incident.dto';
import { UpdateAssignmentStatusDto } from './dto/update-assignment-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  /**
   * Public SOS Incident Submission
   * POST /api/incidents
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createIncidentDto: CreateIncidentDto) {
    return this.incidentsService.createIncident(createIncidentDto);
  }

  /**
   * Incident List with Filtering, Search & Pagination
   * GET /api/incidents
   */
  @Get()
  findAll(@Query() query: QueryIncidentDto) {
    return this.incidentsService.findAll(query);
  }

  /**
   * Intelligent Priority Ranked Queue (Round 2 Phase 1)
   * GET /api/incidents/prioritized
   * Must come before GET :id so 'prioritized' is not parsed as an ID parameter
   */
  @Get('prioritized')
  getPrioritizedQueue(@Query('limit') limit?: number) {
    return this.incidentsService.getPrioritizedActiveQueue(limit ? Number(limit) : 50);
  }

  /**
   * Phase 3: Intelligent Location-Based Dispatch Recommendation
   * GET /api/incidents/:id/recommended-teams
   */
  @Get(':id/recommended-teams')
  getRecommendedTeams(@Param('id') id: string) {
    return this.incidentsService.getRecommendedTeams(id);
  }

  /**
   * Phase 3: Dispatch & Assign Response Team to Incident
   * POST /api/incidents/:id/assign
   */
  @Post(':id/assign')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  assignTeam(
    @Param('id') id: string,
    @Body() assignDto: AssignIncidentDto,
    @Req() req: any,
  ) {
    return this.incidentsService.assignTeam(id, assignDto, req.user);
  }

  /**
   * Phase 4: Assignment Lifecycle Status Controller
   * PATCH /api/incidents/:id/assignments/:assignmentId/status
   */
  @Patch(':id/assignments/:assignmentId/status')
  @UseGuards(JwtAuthGuard)
  updateAssignmentStatus(
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
    @Body() body: UpdateAssignmentStatusDto,
    @Req() req: any,
  ) {
    return this.incidentsService.updateAssignmentStatus(id, assignmentId, body, req.user);
  }

  /**
   * Incident Details
   * GET /api/incidents/:id
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.incidentsService.findOne(id);
  }

  /**
   * Update Incident Status
   * PATCH /api/incidents/:id/status
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateStatusDto,
    @Req() req: any,
  ) {
    return this.incidentsService.updateStatus(id, updateStatusDto, req.user);
  }

  /**
   * Update / Override Incident Severity
   * PATCH /api/incidents/:id/severity
   */
  @Patch(':id/severity')
  @UseGuards(JwtAuthGuard)
  updateSeverity(
    @Param('id') id: string,
    @Body() updateSeverityDto: UpdateSeverityDto,
    @Req() req: any,
  ) {
    return this.incidentsService.updateSeverity(id, updateSeverityDto, req.user);
  }

  /**
   * Delete Incident (Remove duplicate or test reports)
   * DELETE /api/incidents/:id
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.incidentsService.remove(id);
  }
}
