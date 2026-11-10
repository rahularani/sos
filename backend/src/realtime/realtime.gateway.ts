import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  afterInit(server: Server) {
    this.logger.log('Socket.IO Gateway initialized for real-time incident streaming.');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    client.emit('connected', {
      status: 'connected',
      message: 'Connected to UYRA Real-Time Incident Gateway',
      timestamp: new Date().toISOString(),
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Broadcast newly submitted incident to all connected dashboards
   */
  broadcastIncidentCreated(incident: any) {
    this.logger.log(`Broadcasting incident:created -> ${incident.id || incident.referenceNumber}`);
    this.server.emit('incident:created', incident);
  }

  /**
   * Broadcast incident updates (e.g. severity override)
   */
  broadcastIncidentUpdated(incident: any) {
    this.logger.log(`Broadcasting incident:updated -> ${incident.id || incident.referenceNumber}`);
    this.server.emit('incident:updated', incident);
  }

  /**
   * Broadcast status change
   */
  broadcastIncidentStatusChanged(payload: { incident: any; previousStatus: string; newStatus: string }) {
    this.logger.log(`Broadcasting incident:status_changed -> ${payload.incident.id || payload.incident.referenceNumber}`);
    this.server.emit('incident:status_changed', payload);
  }

  /**
   * Broadcast deletion
   */
  broadcastIncidentDeleted(incidentId: string) {
    this.logger.log(`Broadcasting incident:deleted -> ${incidentId}`);
    this.server.emit('incident:deleted', { id: incidentId });
  }

  /**
   * Team Real-Time Events (Round 2 Phase 2)
   */
  broadcastTeamCreated(team: any) {
    this.logger.log(`Broadcasting team:created -> ${team.id} (${team.name})`);
    this.server.emit('team:created', team);
  }

  broadcastTeamUpdated(team: any) {
    this.logger.log(`Broadcasting team:updated -> ${team.id} (${team.name})`);
    this.server.emit('team:updated', team);
  }

  broadcastTeamStatusChanged(payload: { team: any; previousStatus: string; newStatus: string }) {
    this.logger.log(
      `Broadcasting team:status_changed -> ${payload.team.id} (${payload.previousStatus} -> ${payload.newStatus})`,
    );
    this.server.emit('team:status_changed', payload);
  }

  broadcastTeamDeleted(teamId: string) {
    this.logger.log(`Broadcasting team:deleted -> ${teamId}`);
    this.server.emit('team:deleted', { id: teamId });
  }


  /**
   * Phase 3 & 4 Dispatch & Tracking Events
   */
  broadcastIncidentAssigned(payload: { incident: any; team: any; assignment: any; distanceKm: number | null }) {
    this.logger.log(`Broadcasting incident:assigned -> Incident ${payload.incident.id || payload.incident.referenceNumber} to Team ${payload.team.id} (${payload.team.name})`);
    this.server.emit('incident:assigned', payload);
  }

  broadcastAssignmentCompleted(payload: { incident: any; team: any; assignment: any }) {
    this.logger.log(`Broadcasting assignment:completed -> Incident ${payload.incident.id || payload.incident.referenceNumber}`);
    this.server.emit('assignment:completed', payload);
  }

  /**
   * Broadcast refreshed dashboard statistics
   */
  broadcastStatsUpdated(stats: any) {
    this.logger.log('Broadcasting dashboard:stats_updated');
    this.server.emit('dashboard:stats_updated', stats);
  }
}
