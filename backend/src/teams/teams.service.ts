import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import {
  EmergencyCategory,
  TeamAvailabilityStatus,
  AssignmentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { UpdateTeamStatusDto } from './dto/update-team-status.dto';
import { QueryTeamDto } from './dto/query-team.dto';

@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  /**
   * Normalize and map category string to Prisma EmergencyCategory enum.
   * Supports: Medical, Fire, Rescue, Disaster, Police, General, Road Accident, Building Collapse, Flood.
   */
  mapCategory(catStr: string): EmergencyCategory {
    if (!catStr) {
      throw new BadRequestException('Emergency category is required.');
    }

    const normalized = catStr.trim().toUpperCase().replace(/[\s-]/g, '_');

    // Direct enum matches
    if (normalized === 'FIRE' || normalized === 'FIRE_EMERGENCY') {
      return EmergencyCategory.FIRE;
    }
    if (normalized === 'ROAD_ACCIDENT' || normalized === 'ROAD_ACCIDENT_EMERGENCY' || normalized === 'TRAFFIC') {
      return EmergencyCategory.ROAD_ACCIDENT;
    }
    if (normalized === 'MEDICAL' || normalized === 'MEDICAL_EMERGENCY' || normalized === 'AMBULANCE') {
      return EmergencyCategory.MEDICAL;
    }
    if (normalized === 'FLOOD' || normalized === 'FLOOD_EMERGENCY' || normalized === 'WATER_RESCUE') {
      return EmergencyCategory.FLOOD;
    }
    if (normalized === 'BUILDING_COLLAPSE' || normalized === 'COLLAPSE' || normalized === 'RESCUE') {
      // Phase 2 requires Rescue / Disaster / Police / General
      // Rescue -> BUILDING_COLLAPSE (or search & rescue)
      return EmergencyCategory.BUILDING_COLLAPSE;
    }
    if (normalized === 'DISASTER') {
      return EmergencyCategory.FLOOD; // Natural disaster category
    }
    if (normalized === 'POLICE' || normalized === 'SECURITY') {
      return EmergencyCategory.OTHER;
    }
    if (normalized === 'GENERAL' || normalized === 'OTHER' || normalized === 'OTHER_EMERGENCIES') {
      return EmergencyCategory.OTHER;
    }

    // Check if directly matches EmergencyCategory keys
    if (Object.values(EmergencyCategory).includes(normalized as EmergencyCategory)) {
      return normalized as EmergencyCategory;
    }

    throw new BadRequestException(
      `Invalid category '${catStr}'. Supported categories: Medical, Fire, Rescue, Disaster, Police, General, Road Accident, Building Collapse, Flood.`,
    );
  }

  /**
   * Helper: Map EmergencyCategory enum to UI label
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
        return 'Rescue & Collapse';
      case EmergencyCategory.FLOOD:
        return 'Flood & Disaster';
      case EmergencyCategory.OTHER:
      default:
        return 'General / Police';
    }
  }

  /**
   * Normalize and map status string to TeamAvailabilityStatus enum.
   */
  mapStatus(statusStr: string): TeamAvailabilityStatus {
    if (!statusStr) {
      throw new BadRequestException('Status is required.');
    }

    const normalized = statusStr.trim().toUpperCase().replace(/[\s-]/g, '_');

    if (normalized === 'AVAILABLE') return TeamAvailabilityStatus.AVAILABLE;
    if (normalized === 'DISPATCHED') return TeamAvailabilityStatus.DISPATCHED;
    if (normalized === 'BUSY') return TeamAvailabilityStatus.BUSY;
    if (normalized === 'OFF_DUTY' || normalized === 'OFFDUTY') return TeamAvailabilityStatus.OFF_DUTY;

    throw new BadRequestException(
      `Invalid status '${statusStr}'. Allowed values: AVAILABLE, DISPATCHED, BUSY, OFF_DUTY.`,
    );
  }

  /**
   * Format team entity for API responses
   */
  formatTeam(team: any) {
    if (!team) return null;
    return {
      id: team.id,
      name: team.name,
      category: team.category,
      categoryLabel: this.categoryToLabel(team.category),
      latitude: team.latitude,
      longitude: team.longitude,
      status: team.status,
      contactPhone: team.contactPhone || null,
      notes: team.notes || null,
      activeAssignment: team.assignments?.find(
        (a: any) => a.status === AssignmentStatus.ASSIGNED || a.status === AssignmentStatus.EN_ROUTE || a.status === AssignmentStatus.ON_SCENE,
      ) || null,
      assignments: team.assignments || [],
      totalAssignments: team._count?.assignments ?? (team.assignments ? team.assignments.length : 0),
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    };
  }

  /**
   * POST /api/teams
   * Create a response team.
   */
  async createTeam(dto: CreateTeamDto) {
    // 1. Validate Category
    const enumCategory = this.mapCategory(dto.category);

    // 2. Validate Duplicate Team Name
    const existing = await this.prisma.responseTeam.findUnique({
      where: { name: dto.name.trim() },
    });
    if (existing) {
      throw new ConflictException(`A response team with name "${dto.name.trim()}" already exists.`);
    }

    // 3. Persist team
    const team = await this.prisma.responseTeam.create({
      data: {
        name: dto.name.trim(),
        category: enumCategory,
        latitude: Number(dto.latitude),
        longitude: Number(dto.longitude),
        status: TeamAvailabilityStatus.AVAILABLE,
        contactPhone: dto.contactPhone?.trim() || null,
        notes: dto.notes?.trim() || null,
      },
      include: {
        assignments: {
          take: 5,
          orderBy: { assignedAt: 'desc' },
          include: {
            incident: {
              select: {
                id: true,
                referenceNumber: true,
                title: true,
                category: true,
                confirmedSeverity: true,
                status: true,
              },
            },
          },
        },
        _count: { select: { assignments: true } },
      },
    });

    const formatted = this.formatTeam(team);

    // 4. Broadcast real-time event
    try {
      this.realtimeGateway.broadcastTeamCreated(formatted);
    } catch (err) {
      this.logger.error(`Failed to broadcast team:created event: ${err.message}`);
    }

    return formatted;
  }

  /**
   * GET /api/teams
   * List teams with pagination, category filter, status filter, and text search.
   */
  async findAll(query: QueryTeamDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ResponseTeamWhereInput = {};

    // Filter by Category
    if (query.category && query.category !== 'ALL') {
      try {
        where.category = this.mapCategory(query.category);
      } catch {
        // If unknown, search or ignore
      }
    }

    // Filter by Status
    if (query.status && query.status !== 'ALL') {
      try {
        where.status = this.mapStatus(query.status);
      } catch {
        // ignore
      }
    }

    // Filter by Search (Name, Contact, Notes)
    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { contactPhone: { contains: term, mode: 'insensitive' } },
        { notes: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [teams, total] = await Promise.all([
      this.prisma.responseTeam.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          assignments: {
            where: {
              status: {
                in: [AssignmentStatus.ASSIGNED, AssignmentStatus.EN_ROUTE, AssignmentStatus.ON_SCENE],
              },
            },
            take: 1,
            include: {
              incident: {
                select: {
                  id: true,
                  referenceNumber: true,
                  title: true,
                  confirmedSeverity: true,
                  status: true,
                },
              },
            },
          },
          _count: { select: { assignments: true } },
        },
      }),
      this.prisma.responseTeam.count({ where }),
    ]);

    // Also compute status counters for overview widgets
    const [availableCount, busyCount, dispatchedCount, offDutyCount] = await Promise.all([
      this.prisma.responseTeam.count({ where: { status: TeamAvailabilityStatus.AVAILABLE } }),
      this.prisma.responseTeam.count({ where: { status: TeamAvailabilityStatus.BUSY } }),
      this.prisma.responseTeam.count({ where: { status: TeamAvailabilityStatus.DISPATCHED } }),
      this.prisma.responseTeam.count({ where: { status: TeamAvailabilityStatus.OFF_DUTY } }),
    ]);

    const formattedTeams = teams.map((t) => this.formatTeam(t));

    return {
      teams: formattedTeams,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      counts: {
        total: availableCount + busyCount + dispatchedCount + offDutyCount,
        available: availableCount,
        busy: busyCount,
        dispatched: dispatchedCount,
        offDuty: offDutyCount,
      },
    };
  }

  /**
   * GET /api/teams/:id
   * Retrieve team and complete assignment history.
   */
  async findOne(id: string) {
    const team = await this.prisma.responseTeam.findUnique({
      where: { id },
      include: {
        assignments: {
          orderBy: { assignedAt: 'desc' },
          include: {
            incident: {
              select: {
                id: true,
                referenceNumber: true,
                title: true,
                category: true,
                confirmedSeverity: true,
                status: true,
                latitude: true,
                longitude: true,
                address: true,
                createdAt: true,
              },
            },
          },
        },
        _count: { select: { assignments: true } },
      },
    });

    if (!team) {
      throw new NotFoundException(`Response team with ID "${id}" was not found.`);
    }

    return this.formatTeam(team);
  }

  /**
   * PATCH /api/teams/:id
   * Update team details.
   */
  async updateTeam(id: string, dto: UpdateTeamDto) {
    const existing = await this.prisma.responseTeam.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Response team with ID "${id}" was not found.`);
    }

    // Check duplicate name if changing name
    if (dto.name && dto.name.trim() !== existing.name) {
      const duplicate = await this.prisma.responseTeam.findUnique({
        where: { name: dto.name.trim() },
      });
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException(`A response team with name "${dto.name.trim()}" already exists.`);
      }
    }

    const updateData: Prisma.ResponseTeamUpdateInput = {};
    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.category !== undefined) updateData.category = this.mapCategory(dto.category);
    if (dto.latitude !== undefined) updateData.latitude = Number(dto.latitude);
    if (dto.longitude !== undefined) updateData.longitude = Number(dto.longitude);
    if (dto.contactPhone !== undefined) updateData.contactPhone = dto.contactPhone?.trim() || null;
    if (dto.notes !== undefined) updateData.notes = dto.notes?.trim() || null;

    const updated = await this.prisma.responseTeam.update({
      where: { id },
      data: updateData,
      include: {
        assignments: {
          take: 5,
          orderBy: { assignedAt: 'desc' },
          include: {
            incident: {
              select: {
                id: true,
                referenceNumber: true,
                title: true,
                confirmedSeverity: true,
                status: true,
              },
            },
          },
        },
        _count: { select: { assignments: true } },
      },
    });

    const formatted = this.formatTeam(updated);

    try {
      this.realtimeGateway.broadcastTeamUpdated(formatted);
    } catch (err) {
      this.logger.error(`Failed to broadcast team:updated event: ${err.message}`);
    }

    return formatted;
  }

  /**
   * PATCH /api/teams/:id/status
   * Update team availability enforcing business rules:
   * - A team with an active assignment must not be marked AVAILABLE manually.
   * - A team must not receive another assignment while BUSY or DISPATCHED.
   * - OFF_DUTY teams cannot be assigned.
   * - Only authorized administrators may change team status.
   */
  async updateStatus(id: string, dto: UpdateTeamStatusDto) {
    const team = await this.prisma.responseTeam.findUnique({
      where: { id },
      include: {
        assignments: {
          where: {
            status: {
              in: [AssignmentStatus.ASSIGNED, AssignmentStatus.EN_ROUTE, AssignmentStatus.ON_SCENE],
            },
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundException(`Response team with ID "${id}" was not found.`);
    }

    const previousStatus = team.status;
    const targetStatus = this.mapStatus(dto.status);

    // Business Rule 1: A team with an active assignment must not be marked AVAILABLE manually
    const activeAssignments = team.assignments;
    if (targetStatus === TeamAvailabilityStatus.AVAILABLE && activeAssignments.length > 0) {
      throw new BadRequestException(
        `Team has ${activeAssignments.length} active emergency assignment(s). Cannot set status to AVAILABLE until assignments are completed or cancelled.`,
      );
    }

    const updated = await this.prisma.responseTeam.update({
      where: { id },
      data: { status: targetStatus },
      include: {
        assignments: {
          take: 5,
          orderBy: { assignedAt: 'desc' },
          include: {
            incident: {
              select: {
                id: true,
                referenceNumber: true,
                title: true,
                confirmedSeverity: true,
                status: true,
              },
            },
          },
        },
        _count: { select: { assignments: true } },
      },
    });

    const formatted = this.formatTeam(updated);

    try {
      this.realtimeGateway.broadcastTeamStatusChanged({
        team: formatted,
        previousStatus,
        newStatus: targetStatus,
      });
    } catch (err) {
      this.logger.error(`Failed to broadcast team:status_changed event: ${err.message}`);
    }

    return formatted;
  }

  /**
   * DELETE /api/teams/:id
   * Use safe deletion or deactivation.
   * Do not delete a team that has assignment history or active assignments.
   */
  async remove(id: string) {
    const team = await this.prisma.responseTeam.findUnique({
      where: { id },
      include: {
        _count: { select: { assignments: true } },
      },
    });

    if (!team) {
      throw new NotFoundException(`Response team with ID "${id}" was not found.`);
    }

    // Business Rule: Do not delete a team that has assignment history
    if (team._count.assignments > 0) {
      throw new BadRequestException(
        `Cannot delete team "${team.name}" because it has ${team._count.assignments} historical assignment record(s). Teams with operational history are protected for audit trail integrity. Please transition status to OFF_DUTY instead.`,
      );
    }

    await this.prisma.responseTeam.delete({
      where: { id },
    });

    try {
      this.realtimeGateway.broadcastTeamDeleted(id);
    } catch (err) {
      this.logger.error(`Failed to broadcast team:deleted event: ${err.message}`);
    }

    return {
      success: true,
      message: `Response team "${team.name}" has been permanently removed.`,
      id,
    };
  }
}
