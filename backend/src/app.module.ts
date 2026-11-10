import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RealtimeModule } from './realtime/realtime.module';
import { SeverityModule } from './severity/severity.module';
import { AuthModule } from './auth/auth.module';
import { IncidentsModule } from './incidents/incidents.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { TeamsModule } from './teams/teams.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    PrismaModule,
    RealtimeModule,
    SeverityModule,
    AuthModule,
    IncidentsModule,
    DashboardModule,
    TeamsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
