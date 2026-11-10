import { Injectable, Logger } from '@nestjs/common';
import { EmergencyCategory, SeverityLevel, PriorityLevel } from '@prisma/client';

export interface PriorityBreakdown {
  severityComponent: number;      // 0 - 40
  peopleComponent: number;        // 0 - 25
  categoryComponent: number;      // 0 - 20
  agingComponent: number;         // 0 - 15
  rawScore: number;               // 0 - 100
  priorityScore: number;          // rounded to 2 decimal places
  priorityLevel: PriorityLevel;
  ageMinutes: number;
}

export interface PriorityInput {
  confirmedSeverity: SeverityLevel;
  peopleCount: number;
  peopleBracket?: string;
  category: EmergencyCategory;
  createdAt: Date;
  now?: Date;
}

@Injectable()
export class PriorityService {
  private readonly logger = new Logger(PriorityService.name);

  // 1. Severity Weights (Max 40 points)
  // Higher severity strongly drives priority
  private readonly SEVERITY_SCORES: Record<SeverityLevel, number> = {
    [SeverityLevel.CRITICAL]: 40,
    [SeverityLevel.HIGH]: 28,
    [SeverityLevel.MEDIUM]: 16,
    [SeverityLevel.LOW]: 6,
  };

  // 2. Emergency Category Base Weights (Max 20 points)
  // Reflects inherent life-threat speed of the hazard domain
  private readonly CATEGORY_SCORES: Record<EmergencyCategory, number> = {
    [EmergencyCategory.BUILDING_COLLAPSE]: 20,
    [EmergencyCategory.FIRE]: 17,
    [EmergencyCategory.MEDICAL]: 17,
    [EmergencyCategory.FLOOD]: 13,
    [EmergencyCategory.ROAD_ACCIDENT]: 13,
    [EmergencyCategory.OTHER]: 7,
  };

  // 3. People Affected Scale (Max 25 points)
  // Evaluates either discrete count or bracket
  calculatePeopleScore(peopleCount: number, bracket?: string): number {
    if (peopleCount > 10 || bracket === '10+') return 25;
    if (peopleCount >= 6 || bracket === '6-10') return 18;
    if (peopleCount >= 2 || bracket === '2-5') return 10;
    return 3; // 1 person
  }

  // 4. Aging Component (Max 15 points)
  // Gradually escalates older unresolved incidents to prevent neglect
  // +1 point per 5 minutes of wait time, capped at 15 points (75 mins)
  calculateAgingScore(createdAt: Date, now: Date = new Date()): { agingScore: number; ageMinutes: number } {
    const elapsedMs = Math.max(0, now.getTime() - new Date(createdAt).getTime());
    const ageMinutes = Math.floor(elapsedMs / (1000 * 60));
    // 0.2 points per minute = 1 point per 5 minutes
    const score = Math.min(15, +(ageMinutes * 0.2).toFixed(2));
    return { agingScore: score, ageMinutes };
  }

  /**
   * Evaluates deterministic priority score (0 - 100) and maps to PriorityLevel
   */
  calculatePriority(input: PriorityInput): PriorityBreakdown {
    const now = input.now || new Date();
    const severityComponent = this.SEVERITY_SCORES[input.confirmedSeverity] ?? 6;
    const categoryComponent = this.CATEGORY_SCORES[input.category] ?? 7;
    const peopleComponent = this.calculatePeopleScore(input.peopleCount, input.peopleBracket);
    const { agingScore: agingComponent, ageMinutes } = this.calculateAgingScore(input.createdAt, now);

    const rawScore = severityComponent + peopleComponent + categoryComponent + agingComponent;
    const priorityScore = +Math.min(100, Math.max(0, rawScore)).toFixed(2);

    let priorityLevel: PriorityLevel = PriorityLevel.LOW;
    if (priorityScore >= 75 || input.confirmedSeverity === SeverityLevel.CRITICAL) {
      priorityLevel = PriorityLevel.CRITICAL;
    } else if (priorityScore >= 55) {
      priorityLevel = PriorityLevel.HIGH;
    } else if (priorityScore >= 35) {
      priorityLevel = PriorityLevel.MEDIUM;
    } else {
      priorityLevel = PriorityLevel.LOW;
    }

    return {
      severityComponent,
      peopleComponent,
      categoryComponent,
      agingComponent,
      rawScore,
      priorityScore,
      priorityLevel,
      ageMinutes,
    };
  }
}
