import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import {
  EmergencyCategory,
  SeverityLevel,
  PriorityLevel,
  IncidentStatus,
  TeamAvailabilityStatus,
  AssignmentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SeverityService } from '../severity/severity.service';
import { PriorityService } from '../severity/priority.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { UpdateSeverityDto } from './dto/update-severity.dto';
import { QueryIncidentDto } from './dto/query-incident.dto';
import { AssignIncidentDto } from './dto/assign-incident.dto';
import { calculateHaversineDistanceKm } from './geo-dispatch.utils';

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly severityService: SeverityService,
    private readonly priorityService: PriorityService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  /**
   * Helper: Map Prisma category to UI friendly string
   */
  categoryToLabel(cat: EmergencyCategory): string {
    switch (cat) {
      case EmergencyCategory.FIRE:
        return 'Fire Emergency';
      case EmergencyCategory.MEDICAL:
        return 'Medical Emergency';
      case EmergencyCategory.ROAD_ACCIDENT:
        return 'Road Accident';
      case EmergencyCategory.BUILDING_COLLAPSE:
        return 'Building Collapse';
      case EmergencyCategory.FLOOD:
        return 'Flood';
      case EmergencyCategory.OTHER:
      default:
        return 'Other Emergencies';
    }
  }

  /**
   * Helper: Map SeverityLevel enum to UI friendly string
   */
  severityToLabel(sev: SeverityLevel): string {
    switch (sev) {
      case SeverityLevel.CRITICAL:
        return 'Critical';
      case SeverityLevel.HIGH:
        return 'High';
      case SeverityLevel.MEDIUM:
        return 'Medium';
      case SeverityLevel.LOW:
      default:
        return 'Low';
    }
  }

  parseSeverity(val: string): SeverityLevel {
    const s = (val || '').trim().toUpperCase();
    if (s === 'CRITICAL') return SeverityLevel.CRITICAL;
    if (s === 'HIGH') return SeverityLevel.HIGH;
    if (s === 'MEDIUM') return SeverityLevel.MEDIUM;
    return SeverityLevel.LOW;
  }

  /**
   * Helper: Map string to IncidentStatus enum
   */
  parseStatus(val: string): IncidentStatus {
    const s = (val || '').trim().toUpperCase().replace(/[\s-]/g, '_');
    if (s === 'ASSIGNED') return IncidentStatus.ASSIGNED;
    if (s === 'IN_PROGRESS' || s === 'INPROGRESS') return IncidentStatus.IN_PROGRESS;
    if (s === 'RESOLVED') return IncidentStatus.RESOLVED;
    if (s === 'CANCELLED' || s === 'CANCELED') return IncidentStatus.CANCELLED;
    if (s === 'REPORTED') return IncidentStatus.REPORTED;
    return IncidentStatus.PENDING;
  }

  /**
   * Helper: Map IncidentStatus enum to UI friendly string
   */
  statusToLabel(st: IncidentStatus): string {
    switch (st) {
      case IncidentStatus.ASSIGNED:
        return 'Assigned';
      case IncidentStatus.IN_PROGRESS:
        return 'In Progress';
      case IncidentStatus.RESOLVED:
        return 'Resolved';
      case IncidentStatus.CANCELLED:
        return 'Cancelled';
      case IncidentStatus.REPORTED:
        return 'Reported';
      case IncidentStatus.PENDING:
      default:
        return 'Pending';
    }
  }

  /**
   * Helper: Format incident entity into presentation/API contract
   */
  formatIncident(incident: any) {
    if (!incident) return null;

    const categoryLabel = this.categoryToLabel(incident.category);
    const suggestedSeverityLabel = this.severityToLabel(incident.suggestedSeverity);
    const confirmedSeverityLabel = this.severityToLabel(incident.confirmedSeverity);
    const statusLabel = this.statusToLabel(incident.status);

    const peopleLabels: Record<string, string> = {
      '1': '1 Person',
      '2-5': '2–5 People',
      '6-10': '6–10 People',
      '10+': 'More than 10',
    };

    // Extract active assignment if available
    const activeAssignment = incident.assignments?.find((a: any) =>
      [AssignmentStatus.ASSIGNED, AssignmentStatus.EN_ROUTE, AssignmentStatus.ON_SCENE].includes(a.status),
    );

    return {
      id: incident.referenceNumber, // User facing reference ID
      uuid: incident.id,
      referenceNumber: incident.referenceNumber,
      title: incident.title,
      description: incident.description,
      category: categoryLabel,
      rawCategory: incident.category,
      peopleBracket: incident.peopleBracket,
      peopleCountText: peopleLabels[incident.peopleBracket] || `${incident.peopleCount} People`,
      contactName: incident.contactName || 'Anonymous Citizen',
      contactPhone: incident.contactPhone || 'Not Provided',
      latitude: incident.latitude,
      longitude: incident.longitude,
      accuracy: incident.accuracy,
      address: incident.address || 'Address Not Specified',
      locationTimestamp: incident.locationTimestamp,
      suggestedSeverity: suggestedSeverityLabel,
      confirmedSeverity: confirmedSeverityLabel,
      priorityScore: incident.priorityScore ?? 0,
      priorityLevel: incident.priorityLevel ?? 'LOW',
      priorityRecalculatedAt: incident.priorityRecalculatedAt ? incident.priorityRecalculatedAt.toISOString() : null,
      severityMeta: {
        suggestedSeverity: suggestedSeverityLabel,
        categoryScore: incident.categoryScore,
        peopleScore: incident.peopleScore,
        rawScore: incident.totalScore,
        matchedKeywords: incident.matchedKeywords || [],
        isKeywordEscalated: incident.isKeywordEscalated,
      },
      status: statusLabel,
      rawStatus: incident.status,
      activeAssignment: activeAssignment
        ? {
            id: activeAssignment.id,
            status: activeAssignment.status,
            assignedAt: activeAssignment.assignedAt.toISOString(),
            assignedBy: activeAssignment.assignedBy,
            notes: activeAssignment.notes,
            team: activeAssignment.team
              ? {
                  id: activeAssignment.team.id,
                  name: activeAssignment.team.name,
                  category: activeAssignment.team.category,
                  status: activeAssignment.team.status,
                  contactPhone: activeAssignment.team.contactPhone,
                  latitude: activeAssignment.team.latitude,
                  longitude: activeAssignment.team.longitude,
                }
              : null,
          }
        : null,
      assignments: (incident.assignments || []).map((a: any) => ({
        id: a.id,
        teamId: a.teamId,
        teamName: a.team?.name || 'Unknown Team',
        teamCategory: a.team?.category,
        teamStatus: a.team?.status,
        status: a.status,
        assignedBy: a.assignedBy,
        assignedAt: a.assignedAt.toISOString(),
        completedAt: a.completedAt ? a.completedAt.toISOString() : null,
        notes: a.notes,
      })),
      reportedAt: incident.createdAt.toISOString(),
      updatedAt: incident.updatedAt.toISOString(),
      statusHistory: (incident.statusHistory || []).map((h: any) => ({
        id: h.id,
        status: this.statusToLabel(h.newStatus),
        rawStatus: h.newStatus,
        previousStatus: h.previousStatus ? this.statusToLabel(h.previousStatus) : null,
        timestamp: h.createdAt.toISOString(),
        actor: h.updatedBy,
        note: h.note || '',
      })),
    };
  }

  /**
   * 1. Public SOS Submission (POST /api/incidents)
   */
  async createIncident(dto: CreateIncidentDto) {
    const enumCategory = this.severityService.normalizeCategory(dto.category);
    const { bracket, numericCount } = this.severityService.normalizePeopleBracket(
      dto.peopleBracket || '1',
    );

    const finalTitle = dto.title?.trim() || `${this.categoryToLabel(enumCategory)} Emergency Alert`;
    const finalDescription = dto.description?.trim() || 'Emergency report transmitted via public SOS portal.';

    const severityCalc = this.severityService.calculateSeverity(
      enumCategory,
      bracket,
      finalTitle,
      finalDescription,
    );

    const randomSuffix = Math.floor(9000 + Math.random() * 999);
    const referenceNumber = `UYRA-2026-${randomSuffix}`;

    const locationTimestamp = dto.locationTimestamp
      ? new Date(dto.locationTimestamp)
      : dto.latitude && dto.longitude
      ? new Date()
      : null;

    const priorityCalc = this.priorityService.calculatePriority({
      confirmedSeverity: severityCalc.suggestedSeverity,
      peopleCount: numericCount,
      peopleBracket: bracket,
      category: enumCategory,
      createdAt: new Date(),
    });

    const incident = await this.prisma.incident.create({
      data: {
        referenceNumber,
        title: finalTitle,
        description: finalDescription,
        category: enumCategory,
        peopleBracket: bracket,
        peopleCount: numericCount,
        contactName: dto.contactName?.trim() || null,
        contactPhone: dto.contactPhone?.trim() || null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        accuracy: dto.accuracy ?? null,
        address: dto.address?.trim() || null,
        locationTimestamp,
        suggestedSeverity: severityCalc.suggestedSeverity,
        confirmedSeverity: severityCalc.suggestedSeverity,
        categoryScore: severityCalc.categoryScore,
        peopleScore: severityCalc.peopleScore,
        totalScore: severityCalc.totalScore,
        matchedKeywords: severityCalc.matchedKeywords,
        isKeywordEscalated: severityCalc.isKeywordEscalated,
        priorityScore: priorityCalc.priorityScore,
        priorityLevel: priorityCalc.priorityLevel,
        priorityRecalculatedAt: new Date(),
        status: IncidentStatus.REPORTED,
        statusHistory: {
          create: {
            previousStatus: null,
            newStatus: IncidentStatus.REPORTED,
            updatedBy: dto.contactName?.trim() || 'Citizen (SOS Portal)',
            note: 'Emergency distress alert received and queued.',
          },
        },
      },
      include: {
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
        assignments: {
          include: { team: true },
        },
      },
    });

    const formatted = this.formatIncident(incident);

    try {
      this.realtimeGateway.broadcastIncidentCreated(formatted);
      const stats = await this.getQuickStats();
      this.realtimeGateway.broadcastStatsUpdated(stats);
    } catch (err) {
      this.logger.error(`Realtime broadcast failed: ${err.message}`);
    }

    return formatted;
  }

  /**
   * 2. Incident List with Filtering, Search & Pagination (GET /api/incidents)
   */
  async findAll(query: QueryIncidentDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.IncidentWhereInput = {};

    if (query.category && query.category !== 'ALL') {
      where.category = this.severityService.normalizeCategory(query.category);
    }

    if (query.severity && query.severity !== 'ALL') {
      where.confirmedSeverity = this.parseSeverity(query.severity);
    }

    if (query.status && query.status !== 'ALL') {
      where.status = this.parseStatus(query.status);
    }

    if (query.search && query.search.trim()) {
      const searchTerm = query.search.trim();
      where.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { address: { contains: searchTerm, mode: 'insensitive' } },
        { referenceNumber: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.IncidentOrderByWithRelationInput = {};
    if (query.sortBy === 'priorityScore') {
      orderBy.priorityScore = query.sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.createdAt = query.sortOrder === 'asc' ? 'asc' : 'desc';
    }

    const [incidents, total] = await Promise.all([
      this.prisma.incident.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          statusHistory: {
            orderBy: { createdAt: 'desc' },
          },
          assignments: {
            where: {
              status: { in: [AssignmentStatus.ASSIGNED, AssignmentStatus.EN_ROUTE, AssignmentStatus.ON_SCENE] },
            },
            include: { team: true },
          },
        },
      }),
      this.prisma.incident.count({ where }),
    ]);

    return {
      data: incidents.map((inc) => this.formatIncident(inc)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 3. Incident Details (GET /api/incidents/:id)
   */
  async findOne(idOrRef: string) {
    const incident = await this.prisma.incident.findFirst({
      where: {
        OR: [{ id: idOrRef }, { referenceNumber: idOrRef }],
      },
      include: {
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
        assignments: {
          orderBy: { assignedAt: 'desc' },
          include: { team: true },
        },
      },
    });

    if (!incident) {
      throw new NotFoundException(`Incident with identifier "${idOrRef}" not found.`);
    }

    return this.formatIncident(incident);
  }

  /**
   * 4. Update Status (PATCH /api/incidents/:id/status)
   */
  async updateStatus(idOrRef: string, dto: UpdateStatusDto, adminUser?: any) {
    const existing = await this.prisma.incident.findFirst({
      where: {
        OR: [{ id: idOrRef }, { referenceNumber: idOrRef }],
      },
      include: {
        assignments: {
          where: {
            status: { in: [AssignmentStatus.ASSIGNED, AssignmentStatus.EN_ROUTE, AssignmentStatus.ON_SCENE] },
          },
          include: { team: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Incident "${idOrRef}" not found.`);
    }

    const newStatusEnum = this.parseStatus(dto.status);
    const actor = adminUser?.name || dto.updatedBy || 'Admin Supervisor';
    const note = dto.note || `Status transitioned from ${this.statusToLabel(existing.status)} to ${this.statusToLabel(newStatusEnum)}.`;

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedIncident = await tx.incident.update({
        where: { id: existing.id },
        data: {
          status: newStatusEnum,
          statusHistory: {
            create: {
              previousStatus: existing.status,
              newStatus: newStatusEnum,
              updatedBy: actor,
              note,
            },
          },
        },
        include: {
          statusHistory: {
            orderBy: { createdAt: 'desc' },
          },
          assignments: {
            orderBy: { assignedAt: 'desc' },
            include: { team: true },
          },
        },
      });

      const releasedTeams: any[] = [];
      if (newStatusEnum === IncidentStatus.RESOLVED || newStatusEnum === IncidentStatus.CANCELLED) {
        const assignmentStatus =
          newStatusEnum === IncidentStatus.RESOLVED
            ? AssignmentStatus.COMPLETED
            : AssignmentStatus.CANCELLED;

        for (const assignment of existing.assignments) {
          await tx.teamAssignment.update({
            where: { id: assignment.id },
            data: {
              status: assignmentStatus,
              completedAt: new Date(),
              notes: assignment.notes
                ? `${assignment.notes} | Auto-completed on incident ${newStatusEnum.toLowerCase()}`
                : `Auto-completed on incident ${newStatusEnum.toLowerCase()}`,
            },
          });

          const otherActive = await tx.teamAssignment.count({
            where: {
              teamId: assignment.teamId,
              id: { not: assignment.id },
              status: { in: [AssignmentStatus.ASSIGNED, AssignmentStatus.EN_ROUTE, AssignmentStatus.ON_SCENE] },
            },
          });

          if (otherActive === 0) {
            const updatedTeam = await tx.responseTeam.update({
              where: { id: assignment.teamId },
              data: { status: TeamAvailabilityStatus.AVAILABLE },
            });
            releasedTeams.push(updatedTeam);
          }
        }
      }

      return { updatedIncident, releasedTeams };
    });

    const formatted = this.formatIncident(result.updatedIncident);

    this.realtimeGateway.broadcastIncidentStatusChanged({
      incident: formatted,
      previousStatus: this.statusToLabel(existing.status),
      newStatus: this.statusToLabel(newStatusEnum),
    });

    if (newStatusEnum === IncidentStatus.RESOLVED || newStatusEnum === IncidentStatus.CANCELLED) {
      for (const relTeam of result.releasedTeams) {
        this.realtimeGateway.broadcastTeamStatusChanged({
          team: relTeam,
          previousStatus: TeamAvailabilityStatus.DISPATCHED,
          newStatus: TeamAvailabilityStatus.AVAILABLE,
        });
      }
      this.realtimeGateway.broadcastAssignmentCompleted({
        incident: formatted,
        team: result.releasedTeams[0] || null,
        assignment: formatted.assignments[0] || null,
      });
    }

    const stats = await this.getQuickStats();
    this.realtimeGateway.broadcastStatsUpdated(stats);

    return formatted;
  }

  /**
   * Phase 4: Assignment Lifecycle Controller (Competition Req #2)
   * Validated Lifecycle: ASSIGNED -> EN_ROUTE -> ON_SCENE -> COMPLETED / CANCELLED
   */
  async updateAssignmentStatus(
    incidentIdOrRef: string,
    assignmentId: string,
    dto: { status: string; notes?: string; updatedBy?: string },
    adminUser?: any,
  ) {
    const rawStatus = (dto.status || '').trim().toUpperCase().replace(/[\s-]/g, '_');
    let targetStatus: AssignmentStatus;
    if (rawStatus === 'EN_ROUTE' || rawStatus === 'ENROUTE') targetStatus = AssignmentStatus.EN_ROUTE;
    else if (rawStatus === 'ON_SCENE' || rawStatus === 'ONSCENE') targetStatus = AssignmentStatus.ON_SCENE;
    else if (rawStatus === 'COMPLETED') targetStatus = AssignmentStatus.COMPLETED;
    else if (rawStatus === 'CANCELLED' || rawStatus === 'CANCELED') targetStatus = AssignmentStatus.CANCELLED;
    else if (rawStatus === 'ASSIGNED') targetStatus = AssignmentStatus.ASSIGNED;
    else {
      throw new BadRequestException(
        `Invalid assignment status "${dto.status}". Allowed values: ASSIGNED, EN_ROUTE, ON_SCENE, COMPLETED, CANCELLED.`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const assignment = await tx.teamAssignment.findUnique({
        where: { id: assignmentId },
        include: { incident: true, team: true },
      });

      if (!assignment) {
        throw new NotFoundException(`Assignment with ID "${assignmentId}" was not found.`);
      }

      const previousStatus = assignment.status;
      const isFinishing =
        targetStatus === AssignmentStatus.COMPLETED || targetStatus === AssignmentStatus.CANCELLED;

      const updatedAssignment = await tx.teamAssignment.update({
        where: { id: assignmentId },
        data: {
          status: targetStatus,
          completedAt: isFinishing ? new Date() : assignment.completedAt,
          notes: dto.notes ? `${assignment.notes || ''} | ${dto.notes}` : assignment.notes,
        },
        include: { team: true, incident: true },
      });

      let updatedTeam = assignment.team;
      if (isFinishing) {
        const otherActive = await tx.teamAssignment.count({
          where: {
            teamId: assignment.teamId,
            id: { not: assignmentId },
            status: { in: [AssignmentStatus.ASSIGNED, AssignmentStatus.EN_ROUTE, AssignmentStatus.ON_SCENE] },
          },
        });

        if (otherActive === 0) {
          updatedTeam = await tx.responseTeam.update({
            where: { id: assignment.teamId },
            data: { status: TeamAvailabilityStatus.AVAILABLE },
          });
        }
      } else if (targetStatus === AssignmentStatus.ON_SCENE) {
        updatedTeam = await tx.responseTeam.update({
          where: { id: assignment.teamId },
          data: { status: TeamAvailabilityStatus.BUSY },
        });
      }

      return { updatedAssignment, previousStatus, updatedTeam, isFinishing };
    });

    try {
      if (result.isFinishing) {
        this.realtimeGateway.broadcastAssignmentCompleted({
          incident: result.updatedAssignment.incident,
          team: result.updatedTeam,
          assignment: result.updatedAssignment,
        });
        this.realtimeGateway.broadcastTeamStatusChanged({
          team: result.updatedTeam,
          previousStatus: TeamAvailabilityStatus.DISPATCHED,
          newStatus: result.updatedTeam.status,
        });
      } else {
        this.realtimeGateway.broadcastTeamStatusChanged({
          team: result.updatedTeam,
          previousStatus: result.previousStatus,
          newStatus: result.updatedTeam.status,
        });
      }

      const stats = await this.getQuickStats();
      this.realtimeGateway.broadcastStatsUpdated(stats);
    } catch (err) {
      this.logger.error(`Failed to broadcast assignment status update: ${err.message}`);
    }

    return {
      success: true,
      message: `Assignment transitioned from ${result.previousStatus} to ${targetStatus}.`,
      assignment: result.updatedAssignment,
      team: result.updatedTeam,
    };
  }

  /**
   * 5. Override / Confirm Severity (PATCH /api/incidents/:id/severity)
   */
  async updateSeverity(idOrRef: string, dto: UpdateSeverityDto, adminUser?: any) {
    const existing = await this.prisma.incident.findFirst({
      where: {
        OR: [{ id: idOrRef }, { referenceNumber: idOrRef }],
      },
    });

    if (!existing) {
      throw new NotFoundException(`Incident "${idOrRef}" not found.`);
    }

    const newSeverityEnum = this.parseSeverity(dto.severity);
    const actor = adminUser?.name || dto.updatedBy || 'Admin Supervisor';
    const note = dto.note || `Severity confirmed/overridden to ${this.severityToLabel(newSeverityEnum)} by administrator.`;

    const priorityCalc = this.priorityService.calculatePriority({
      confirmedSeverity: newSeverityEnum,
      peopleCount: existing.peopleCount,
      peopleBracket: existing.peopleBracket,
      category: existing.category,
      createdAt: existing.createdAt,
    });

    const updated = await this.prisma.incident.update({
      where: { id: existing.id },
      data: {
        confirmedSeverity: newSeverityEnum,
        priorityScore: priorityCalc.priorityScore,
        priorityLevel: priorityCalc.priorityLevel,
        priorityRecalculatedAt: new Date(),
        statusHistory: {
          create: {
            previousStatus: existing.status,
            newStatus: existing.status,
            updatedBy: actor,
            note,
          },
        },
      },
      include: {
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
        assignments: {
          orderBy: { assignedAt: 'desc' },
          include: { team: true },
        },
      },
    });

    const formatted = this.formatIncident(updated);
    this.realtimeGateway.broadcastIncidentUpdated(formatted);
    const stats = await this.getQuickStats();
    this.realtimeGateway.broadcastStatsUpdated(stats);

    return formatted;
  }

  /**
   * 6. Delete Incident (DELETE /api/incidents/:id)
   */
  async remove(idOrRef: string) {
    const existing = await this.prisma.incident.findFirst({
      where: {
        OR: [{ id: idOrRef }, { referenceNumber: idOrRef }],
      },
    });

    if (!existing) {
      throw new NotFoundException(`Incident "${idOrRef}" not found.`);
    }

    await this.prisma.incident.delete({
      where: { id: existing.id },
    });

    this.realtimeGateway.broadcastIncidentDeleted(existing.referenceNumber);
    const stats = await this.getQuickStats();
    this.realtimeGateway.broadcastStatsUpdated(stats);

    return {
      statusCode: 200,
      message: `Incident ${existing.referenceNumber} has been removed.`,
    };
  }

  /**
   * 7. Intelligent Incident Priority Ranking Queue (Round 2 Phase 1)
   */
  async getPrioritizedActiveQueue(limit = 50) {
    const activeIncidents = await this.prisma.incident.findMany({
      where: {
        status: {
          notIn: [IncidentStatus.RESOLVED, IncidentStatus.CANCELLED],
        },
      },
      include: {
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        assignments: {
          where: {
            status: { in: [AssignmentStatus.ASSIGNED, AssignmentStatus.EN_ROUTE, AssignmentStatus.ON_SCENE] },
          },
          include: {
            team: true,
          },
        },
      },
    });

    const now = new Date();

    const scoredIncidents = activeIncidents.map((incident) => {
      const priorityCalc = this.priorityService.calculatePriority({
        confirmedSeverity: incident.confirmedSeverity,
        peopleCount: incident.peopleCount,
        peopleBracket: incident.peopleBracket,
        category: incident.category,
        createdAt: incident.createdAt,
        now,
      });

      const formatted = this.formatIncident(incident);

      return {
        ...formatted,
        priorityScore: priorityCalc.priorityScore,
        priorityLevel: priorityCalc.priorityLevel,
        priorityBreakdown: {
          severityPoints: priorityCalc.severityComponent,
          peoplePoints: priorityCalc.peopleComponent,
          categoryPoints: priorityCalc.categoryComponent,
          agingPoints: priorityCalc.agingComponent,
          waitingMinutes: priorityCalc.ageMinutes,
        },
      };
    });

    scoredIncidents.sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }
      const timeDiff = new Date(a.reportedAt).getTime() - new Date(b.reportedAt).getTime();
      if (timeDiff !== 0) return timeDiff;
      return a.referenceNumber.localeCompare(b.referenceNumber);
    });

    return {
      total: scoredIncidents.length,
      evaluatedAt: now.toISOString(),
      data: scoredIncidents.slice(0, limit),
    };
  }



    // ===========================================================================
  // PHASE 3 — INTELLIGENT LOCATION-BASED DISPATCH


    // ===========================================================================

  getCategoryCompatibility(incidentCategory: EmergencyCategory, teamCategory: EmergencyCategory): number {
    if (incidentCategory === teamCategory) return 1.0;
    if (incidentCategory === EmergencyCategory.BUILDING_COLLAPSE && teamCategory === EmergencyCategory.FIRE) return 0.8;
    if (incidentCategory === EmergencyCategory.ROAD_ACCIDENT && teamCategory === EmergencyCategory.MEDICAL) return 0.9;
    if (incidentCategory === EmergencyCategory.ROAD_ACCIDENT && teamCategory === EmergencyCategory.FIRE) return 0.8;
    if (incidentCategory === EmergencyCategory.FLOOD && teamCategory === EmergencyCategory.BUILDING_COLLAPSE) return 0.7;
    if (teamCategory === EmergencyCategory.OTHER) return 0.5;
    return 0.3;
  }

  async getRecommendedTeams(idOrRef: string) {
    const incident = await this.prisma.incident.findFirst({
      where: {
        OR: [{ id: idOrRef }, { referenceNumber: idOrRef }],
      },
      include: {
        assignments: {
          where: {
            status: { in: [AssignmentStatus.ASSIGNED, AssignmentStatus.EN_ROUTE, AssignmentStatus.ON_SCENE] },
          },
          include: { team: true },
        },
      },
    });

    if (!incident) {
      throw new NotFoundException(`Incident "${idOrRef}" was not found.`);
    }

    if (incident.status === IncidentStatus.RESOLVED || incident.status === IncidentStatus.CANCELLED) {
      throw new BadRequestException(
        `Incident "${incident.referenceNumber}" is already ${incident.status}. Cannot assign teams to inactive incidents.`,
      );
    }

    const hasValidCoords =
      incident.latitude !== null &&
      incident.latitude !== undefined &&
      !isNaN(incident.latitude) &&
      incident.longitude !== null &&
      incident.longitude !== undefined &&
      !isNaN(incident.longitude);

    const availableTeams = await this.prisma.responseTeam.findMany({
      where: {
        status: TeamAvailabilityStatus.AVAILABLE,
        assignments: {
          none: {
            status: { in: [AssignmentStatus.ASSIGNED, AssignmentStatus.EN_ROUTE, AssignmentStatus.ON_SCENE] },
          },
        },
      },
    });

    const recommended = availableTeams.map((team) => {
      let distanceKm: number | null = null;
      if (hasValidCoords && team.latitude !== null && team.longitude !== null) {
        distanceKm = calculateHaversineDistanceKm(
          incident.latitude!,
          incident.longitude!,
          team.latitude,
          team.longitude,
        );
      }

      const compatibility = this.getCategoryCompatibility(incident.category, team.category);
      const isExactCategoryMatch = incident.category === team.category;

      return {
        id: team.id,
        name: team.name,
        category: team.category,
        categoryLabel: this.categoryToLabel(team.category),
        isExactCategoryMatch,
        compatibilityScore: compatibility,
        status: team.status,
        contactPhone: team.contactPhone,
        notes: team.notes,
        latitude: team.latitude,
        longitude: team.longitude,
        distanceKm: isNaN(distanceKm as number) ? null : distanceKm,
        distanceLabel:
          distanceKm !== null && !isNaN(distanceKm)
            ? `${distanceKm} km (straight-line)`
            : 'Coordinates unavailable',
      };
    });

    recommended.sort((a, b) => {
      if (a.isExactCategoryMatch !== b.isExactCategoryMatch) {
        return a.isExactCategoryMatch ? -1 : 1;
      }
      if (b.compatibilityScore !== a.compatibilityScore) {
        return b.compatibilityScore - a.compatibilityScore;
      }
      if (a.distanceKm !== null && b.distanceKm !== null) {
        return a.distanceKm - b.distanceKm;
      }
      if (a.distanceKm !== null) return -1;
      if (b.distanceKm !== null) return 1;
      return a.name.localeCompare(b.name);
    });

    return {
      incidentId: incident.referenceNumber,
      incidentCategory: this.categoryToLabel(incident.category),
      incidentCoordinates: hasValidCoords ? { latitude: incident.latitude, longitude: incident.longitude } : null,
      eligibleTeamsCount: recommended.length,
      currentActiveAssignment: incident.assignments[0] ? incident.assignments[0] : null,
      data: recommended,
    };
  }

  async assignTeam(idOrRef: string, dto: AssignIncidentDto, adminUser?: any) {
    if (!dto.teamId) {
      throw new BadRequestException('teamId is required to assign an emergency response team.');
    }

    const dispatchResult = await this.prisma.$transaction(async (tx) => {
      const lockedTeams: any[] = await tx.$queryRaw`
        SELECT * FROM response_teams WHERE id = ${dto.teamId} FOR UPDATE
      `;
      if (!lockedTeams || lockedTeams.length === 0) {
        throw new NotFoundException(`Response team with ID "${dto.teamId}" was not found.`);
      }

      const lockedIncidents: any[] = await tx.$queryRaw`
        SELECT * FROM incidents WHERE id = ${idOrRef} OR "referenceNumber" = ${idOrRef} FOR UPDATE
      `;
      if (!lockedIncidents || lockedIncidents.length === 0) {
        throw new NotFoundException(`Incident with identifier "${idOrRef}" was not found.`);
      }

      const lockedIncidentId = lockedIncidents[0].id;

      const incident = await tx.incident.findUnique({
        where: { id: lockedIncidentId },
        include: {
          assignments: {
            where: {
              status: { in: [AssignmentStatus.ASSIGNED, AssignmentStatus.EN_ROUTE, AssignmentStatus.ON_SCENE] },
            },
          },
        },
      });

      if (!incident) {
        throw new NotFoundException(`Incident with identifier "${idOrRef}" was not found.`);
      }

      if (incident.status === IncidentStatus.RESOLVED || incident.status === IncidentStatus.CANCELLED) {
        throw new BadRequestException(
          `Cannot assign team to incident "${incident.referenceNumber}" because it is already ${incident.status}.`,
        );
      }

      if (incident.assignments.length > 0) {
        throw new ConflictException(
          `Incident "${incident.referenceNumber}" already has an active assignment (${incident.assignments[0].id}). Multiple simultaneous active assignments to the same incident are not permitted.`,
        );
      }

      const team = await tx.responseTeam.findUnique({
        where: { id: dto.teamId },
        include: {
          assignments: {
            where: {
              status: { in: [AssignmentStatus.ASSIGNED, AssignmentStatus.EN_ROUTE, AssignmentStatus.ON_SCENE] },
            },
          },
        },
      });

      if (!team) {
        throw new NotFoundException(`Response team with ID "${dto.teamId}" was not found.`);
      }

      if (team.status !== TeamAvailabilityStatus.AVAILABLE) {
        throw new ConflictException(
          `Response team "${team.name}" cannot be assigned because its current status is "${team.status}". Only AVAILABLE teams may receive new dispatches.`,
        );
      }

      if (team.assignments.length > 0) {
        throw new ConflictException(
          `Response team "${team.name}" is already actively deployed on incident ${team.assignments[0].incidentId}. Duplicate active assignments are prohibited.`,
        );
      }

      let distanceKm: number | null = null;
      if (
        incident.latitude !== null &&
        incident.latitude !== undefined &&
        incident.longitude !== null &&
        incident.longitude !== undefined &&
        team.latitude !== null &&
        team.longitude !== null
      ) {
        distanceKm = calculateHaversineDistanceKm(
          incident.latitude,
          incident.longitude,
          team.latitude,
          team.longitude,
        );
      }

      const assignedByActor = adminUser?.name || dto.assignedBy || 'Admin Dispatcher';
      const distanceNote =
        distanceKm !== null && !isNaN(distanceKm)
          ? `Estimated straight-line distance: ${distanceKm} km.`
          : 'Coordinates uncalibrated.';
      const auditNote = dto.notes
        ? `${dto.notes} | Dispatched team "${team.name}". ${distanceNote}`
        : `Dispatched response team "${team.name}" (${team.category}). ${distanceNote}`;

      const assignment = await tx.teamAssignment.create({
        data: {
          incidentId: incident.id,
          teamId: team.id,
          status: AssignmentStatus.ASSIGNED,
          assignedBy: assignedByActor,
          notes: auditNote,
        },
      });

      const updatedTeam = await tx.responseTeam.update({
        where: { id: team.id },
        data: { status: TeamAvailabilityStatus.DISPATCHED },
      });

      const updatedIncident = await tx.incident.update({
        where: { id: incident.id },
        data: {
          status: IncidentStatus.ASSIGNED,
          statusHistory: {
            create: {
              previousStatus: incident.status,
              newStatus: IncidentStatus.ASSIGNED,
              updatedBy: assignedByActor,
              note: auditNote,
            },
          },
        },
        include: {
          statusHistory: {
            orderBy: { createdAt: 'desc' },
          },
          assignments: {
            orderBy: { assignedAt: 'desc' },
            include: { team: true },
          },
        },
      });

      return {
        assignment,
        team: updatedTeam,
        incident: updatedIncident,
        distanceKm: isNaN(distanceKm as number) ? null : distanceKm,
      };
    });

    const formattedIncident = this.formatIncident(dispatchResult.incident);

    try {
      this.realtimeGateway.broadcastIncidentAssigned({
        incident: formattedIncident,
        team: dispatchResult.team,
        assignment: dispatchResult.assignment,
        distanceKm: dispatchResult.distanceKm,
      });

      this.realtimeGateway.broadcastTeamStatusChanged({
        team: dispatchResult.team,
        previousStatus: TeamAvailabilityStatus.AVAILABLE,
        newStatus: TeamAvailabilityStatus.DISPATCHED,
      });

      this.realtimeGateway.broadcastIncidentStatusChanged({
        incident: formattedIncident,
        previousStatus: 'Pending',
        newStatus: 'Assigned',
      });

      const stats = await this.getQuickStats();
      this.realtimeGateway.broadcastStatsUpdated(stats);
    } catch (err) {
      this.logger.error(`Failed to broadcast dispatch events: ${err.message}`);
    }

    return {
      success: true,
      message: `Response team "${dispatchResult.team.name}" successfully dispatched to incident ${formattedIncident.referenceNumber}.`,
      incident: formattedIncident,
      assignedTeam: {
        id: dispatchResult.team.id,
        name: dispatchResult.team.name,
        category: dispatchResult.team.category,
        status: dispatchResult.team.status,
        contactPhone: dispatchResult.team.contactPhone,
        latitude: dispatchResult.team.latitude,
        longitude: dispatchResult.team.longitude,
      },
      assignment: {
        id: dispatchResult.assignment.id,
        status: dispatchResult.assignment.status,
        assignedAt: dispatchResult.assignment.assignedAt.toISOString(),
        assignedBy: dispatchResult.assignment.assignedBy,
        distanceKm: dispatchResult.distanceKm,
        distanceLabel:
          dispatchResult.distanceKm !== null
            ? `${dispatchResult.distanceKm} km (straight-line)`
            : 'Distance unavailable',
        notes: dispatchResult.assignment.notes,
      },
    };
  }

  async getQuickStats() {
    const [total, critical, pending, inProgress, resolved] = await Promise.all([
      this.prisma.incident.count(),
      this.prisma.incident.count({
        where: { confirmedSeverity: SeverityLevel.CRITICAL },
      }),
      this.prisma.incident.count({
        where: { status: IncidentStatus.PENDING },
      }),
      this.prisma.incident.count({
        where: { status: { in: [IncidentStatus.IN_PROGRESS, IncidentStatus.ASSIGNED] } },
      }),
      this.prisma.incident.count({
        where: { status: IncidentStatus.RESOLVED },
      }),
    ]);

    return { total, critical, pending, inProgress, resolved };
  }
}
