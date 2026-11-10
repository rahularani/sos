import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  SeverityLevel,
  PriorityLevel,
  IncidentStatus,
  EmergencyCategory,
  TeamAvailabilityStatus,
  AssignmentStatus,
} from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [
      total,
      critical,
      pending,
      inProgress,
      resolved,
      reported,
      byCategoryRaw,
      bySeverityRaw,
      recentIncidents,
    ] = await Promise.all([
      this.prisma.incident.count(),
      this.prisma.incident.count({
        where: { confirmedSeverity: SeverityLevel.CRITICAL },
      }),
      this.prisma.incident.count({
        where: { status: IncidentStatus.PENDING },
      }),
      this.prisma.incident.count({
        where: { status: IncidentStatus.IN_PROGRESS },
      }),
      this.prisma.incident.count({
        where: { status: IncidentStatus.RESOLVED },
      }),
      this.prisma.incident.count({
        where: { status: IncidentStatus.REPORTED },
      }),
      this.prisma.incident.groupBy({
        by: ['category'],
        _count: { category: true },
      }),
      this.prisma.incident.groupBy({
        by: ['confirmedSeverity'],
        _count: { confirmedSeverity: true },
      }),
      this.prisma.incident.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          referenceNumber: true,
          title: true,
          category: true,
          confirmedSeverity: true,
          status: true,
          createdAt: true,
          address: true,
        },
      }),
    ]);

    const categoryMap: Record<string, number> = {
      'Fire Emergency': 0,
      'Road Accident': 0,
      'Medical Emergency': 0,
      'Flood': 0,
      'Building Collapse': 0,
      'Other Emergencies': 0,
    };

    byCategoryRaw.forEach((item) => {
      let label = 'Other Emergencies';
      if (item.category === EmergencyCategory.FIRE) label = 'Fire Emergency';
      else if (item.category === EmergencyCategory.ROAD_ACCIDENT) label = 'Road Accident';
      else if (item.category === EmergencyCategory.MEDICAL) label = 'Medical Emergency';
      else if (item.category === EmergencyCategory.FLOOD) label = 'Flood';
      else if (item.category === EmergencyCategory.BUILDING_COLLAPSE) label = 'Building Collapse';
      categoryMap[label] = item._count.category;
    });

    const severityMap: Record<string, number> = {
      Critical: 0,
      High: 0,
      Medium: 0,
      Low: 0,
    };

    bySeverityRaw.forEach((item) => {
      let label = 'Low';
      if (item.confirmedSeverity === SeverityLevel.CRITICAL) label = 'Critical';
      else if (item.confirmedSeverity === SeverityLevel.HIGH) label = 'High';
      else if (item.confirmedSeverity === SeverityLevel.MEDIUM) label = 'Medium';
      severityMap[label] = item._count.confirmedSeverity;
    });

    return {
      kpi: {
        total,
        critical,
        pending: pending + reported,
        inProgress,
        resolved,
      },
      // Flat properties for frontend compatibility
      total,
      critical,
      pending: pending + reported,
      inProgress,
      resolved,
      categoryDistribution: Object.entries(categoryMap).map(([name, count]) => ({
        name,
        count,
      })),
      severityDistribution: Object.entries(severityMap).map(([name, count]) => ({
        name,
        count,
      })),
      recentIncidents: recentIncidents.map((inc) => ({
        id: inc.referenceNumber,
        title: inc.title,
        category: inc.category,
        severity: inc.confirmedSeverity,
        status: inc.status,
        address: inc.address,
        createdAt: inc.createdAt.toISOString(),
      })),
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Advanced Analytics for Round 2 Phase 5
   * GET /api/dashboard/round2-stats
   */
  async getRound2Stats() {
    const [
      totalIncidents,
      criticalIncidents,
      inProgressIncidents,
      resolvedIncidents,
      pendingIncidents,
      totalTeams,
      availableTeams,
      busyTeams,
      dispatchedTeams,
      offDutyTeams,
      activeAssignmentsGroup,
      byCategoryRaw,
      byPriorityRaw,
      recentIncidentsRaw,
    ] = await Promise.all([
      // Total emergency incidents
      this.prisma.incident.count(),

      // Critical incidents (confirmed severity or priority level critical)
      this.prisma.incident.count({
        where: {
          OR: [
            { confirmedSeverity: SeverityLevel.CRITICAL },
            { priorityLevel: PriorityLevel.CRITICAL },
          ],
        },
      }),

      // In-progress incidents
      this.prisma.incident.count({
        where: { status: IncidentStatus.IN_PROGRESS },
      }),

      // Resolved incidents
      this.prisma.incident.count({
        where: { status: IncidentStatus.RESOLVED },
      }),

      // Pending / Reported incidents
      this.prisma.incident.count({
        where: {
          status: { in: [IncidentStatus.PENDING, IncidentStatus.REPORTED] },
        },
      }),

      // Response teams count
      this.prisma.responseTeam.count(),

      // Available response teams
      this.prisma.responseTeam.count({
        where: { status: TeamAvailabilityStatus.AVAILABLE },
      }),

      // Busy response teams
      this.prisma.responseTeam.count({
        where: { status: TeamAvailabilityStatus.BUSY },
      }),

      // Dispatched response teams
      this.prisma.responseTeam.count({
        where: { status: TeamAvailabilityStatus.DISPATCHED },
      }),

      // Off-duty teams
      this.prisma.responseTeam.count({
        where: { status: TeamAvailabilityStatus.OFF_DUTY },
      }),

      // Assigned incidents: distinct incidents with active team assignments
      // Ensuring incidents with multiple assignments are not double-counted
      this.prisma.teamAssignment.groupBy({
        by: ['incidentId'],
        where: {
          status: {
            in: [
              AssignmentStatus.ASSIGNED,
              AssignmentStatus.EN_ROUTE,
              AssignmentStatus.ON_SCENE,
            ],
          },
        },
      }),

      // Incident distribution by category
      this.prisma.incident.groupBy({
        by: ['category'],
        _count: { category: true },
      }),

      // Incident distribution by priority
      this.prisma.incident.groupBy({
        by: ['priorityLevel'],
        _count: { priorityLevel: true },
      }),

      // Recent 5 incidents
      this.prisma.incident.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          referenceNumber: true,
          title: true,
          category: true,
          confirmedSeverity: true,
          priorityLevel: true,
          priorityScore: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    const assignedIncidents = activeAssignmentsGroup.length;

    // Build Category Distribution Breakdown
    const categoryNameMapping: Record<EmergencyCategory, string> = {
      [EmergencyCategory.FIRE]: 'Fire Emergency',
      [EmergencyCategory.ROAD_ACCIDENT]: 'Road Accident',
      [EmergencyCategory.MEDICAL]: 'Medical Emergency',
      [EmergencyCategory.FLOOD]: 'Flood & Disaster',
      [EmergencyCategory.BUILDING_COLLAPSE]: 'Rescue & Collapse',
      [EmergencyCategory.OTHER]: 'General & Police',
    };

    const categoryCounts: Record<string, number> = {
      'Fire Emergency': 0,
      'Road Accident': 0,
      'Medical Emergency': 0,
      'Flood & Disaster': 0,
      'Rescue & Collapse': 0,
      'General & Police': 0,
    };

    byCategoryRaw.forEach((item) => {
      const label = categoryNameMapping[item.category] || 'General & Police';
      categoryCounts[label] = (categoryCounts[label] || 0) + item._count.category;
    });

    const categoryDistribution = Object.entries(categoryCounts).map(([name, count]) => ({
      name,
      count,
    }));

    // Build Priority Distribution Breakdown
    const priorityCounts: Record<string, number> = {
      Critical: 0,
      High: 0,
      Medium: 0,
      Low: 0,
    };

    byPriorityRaw.forEach((item) => {
      let label = 'Low';
      if (item.priorityLevel === PriorityLevel.CRITICAL) label = 'Critical';
      else if (item.priorityLevel === PriorityLevel.HIGH) label = 'High';
      else if (item.priorityLevel === PriorityLevel.MEDIUM) label = 'Medium';
      priorityCounts[label] = (priorityCounts[label] || 0) + item._count.priorityLevel;
    });

    const priorityDistribution = [
      { name: 'Critical', count: priorityCounts.Critical, fill: '#DC2626' },
      { name: 'High', count: priorityCounts.High, fill: '#F97316' },
      { name: 'Medium', count: priorityCounts.Medium, fill: '#EAB308' },
      { name: 'Low', count: priorityCounts.Low, fill: '#16A34A' },
    ];

    // Team Availability Distribution
    const teamAvailabilityDistribution = [
      { name: 'Available', count: availableTeams, fill: '#16A34A' },
      { name: 'Busy', count: busyTeams, fill: '#EAB308' },
      { name: 'Dispatched', count: dispatchedTeams, fill: '#DC2626' },
      { name: 'Off Duty', count: offDutyTeams, fill: '#64748B' },
    ];

    // Assigned vs Resolved Comparative
    const assignmentResolutionTrend = [
      { stage: 'Reported / Pending', count: pendingIncidents },
      { stage: 'Assigned Active', count: assignedIncidents },
      { stage: 'In Progress', count: inProgressIncidents },
      { stage: 'Resolved', count: resolvedIncidents },
    ];

    return {
      kpi: {
        totalIncidents,
        criticalIncidents,
        assignedIncidents,
        inProgressIncidents,
        resolvedIncidents,
        pendingIncidents,
        totalTeams,
        availableTeams,
        busyTeams,
        dispatchedTeams,
        offDutyTeams,
        resolutionRate: totalIncidents > 0 ? +((resolvedIncidents / totalIncidents) * 100).toFixed(1) : 0,
        activeResponseFleet: availableTeams + busyTeams + dispatchedTeams,
      },
      distributions: {
        byCategory: categoryDistribution,
        byPriority: priorityDistribution,
        byTeamAvailability: teamAvailabilityDistribution,
        assignedVsResolved: assignmentResolutionTrend,
      },
      fleetSummary: {
        totalTeams,
        availableTeams,
        busyTeams,
        dispatchedTeams,
        offDutyTeams,
        deploymentPercentage:
          totalTeams > 0
            ? +(((busyTeams + dispatchedTeams) / totalTeams) * 100).toFixed(1)
            : 0,
      },
      incidentVolume: {
        total: totalIncidents,
        active: inProgressIncidents + pendingIncidents,
        resolved: resolvedIncidents,
        criticalRatio:
          totalIncidents > 0
            ? +((criticalIncidents / totalIncidents) * 100).toFixed(1)
            : 0,
      },
      recentIncidents: recentIncidentsRaw.map((inc) => ({
        id: inc.referenceNumber,
        title: inc.title,
        category: inc.category,
        severity: inc.confirmedSeverity,
        priorityLevel: inc.priorityLevel,
        priorityScore: inc.priorityScore,
        status: inc.status,
        createdAt: inc.createdAt.toISOString(),
      })),
      timestamp: new Date().toISOString(),
    };
  }
}

