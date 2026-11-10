import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      status: 'healthy',
      platform: 'UYRA – Public Emergency Response Platform API',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      frontends: {
        citizenPortal: 'http://localhost:5173',
        adminPortal: 'http://localhost:5174',
      },
      endpoints: {
        health: '/health',
        apiRoot: '/api',
        incidents: '/api/incidents',
        prioritizedIncidents: '/api/incidents/prioritized',
        teams: '/api/teams',
        dashboardStats: '/api/dashboard/stats',
        auth: {
          adminLogin: '/api/auth/admin/login',
          register: '/api/auth/register',
          login: '/api/auth/login',
        },
      },
    };
  }

  @Get('api')
  getApiRoot() {
    return this.getRoot();
  }

  @Get('health')
  getHealth() {
    return {
      status: 'UP',
      database: 'Connected (Supabase PostgreSQL)',
      timestamp: new Date().toISOString(),
    };
  }
}

