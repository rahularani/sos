import { Module } from '@nestjs/common';
import { SeverityService } from './severity.service';
import { PriorityService } from './priority.service';

@Module({
  providers: [SeverityService, PriorityService],
  exports: [SeverityService, PriorityService],
})
export class SeverityModule {}
