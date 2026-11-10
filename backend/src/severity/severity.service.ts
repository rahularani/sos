import { Injectable } from '@nestjs/common';
import { EmergencyCategory, SeverityLevel } from '@prisma/client';

export interface SeverityCalculationResult {
  suggestedSeverity: SeverityLevel;
  categoryScore: number;
  peopleScore: number;
  totalScore: number;
  matchedKeywords: string[];
  isKeywordEscalated: boolean;
}

@Injectable()
export class SeverityService {
  // Category score rules as defined in UYRA Master Specification §9.1
  private readonly CATEGORY_SCORES: Record<EmergencyCategory, number> = {
    [EmergencyCategory.BUILDING_COLLAPSE]: 4,
    [EmergencyCategory.FIRE]: 3,
    [EmergencyCategory.MEDICAL]: 3,
    [EmergencyCategory.ROAD_ACCIDENT]: 2,
    [EmergencyCategory.FLOOD]: 2,
    [EmergencyCategory.OTHER]: 1,
  };

  // People affected score brackets as defined in UYRA Master Specification §9.2
  private readonly PEOPLE_BRACKET_SCORES: Record<string, number> = {
    '1': 0,
    '2-5': 1,
    '6-10': 2,
    '10+': 3,
  };

  // Critical warning keywords as defined in UYRA Master Specification §9.3
  private readonly CRITICAL_KEYWORDS: string[] = [
    'trapped',
    'unconscious',
    'heavy bleeding',
    'bleeding',
    'explosion',
    'collapse',
    'fatal',
    'not breathing',
    'sinking',
    'submerged',
    'gas leak',
    'chemical',
    'mass casualty',
    'child',
    'children',
    'infant',
    'burn',
  ];

  /**
   * Normalizes incoming string categories to Prisma EmergencyCategory enum
   */
  normalizeCategory(rawCategory: string): EmergencyCategory {
    const cleaned = (rawCategory || '').trim().toLowerCase();
    if (cleaned.includes('fire')) return EmergencyCategory.FIRE;
    if (cleaned.includes('road') || cleaned.includes('accident') || cleaned.includes('vehicle')) {
      return EmergencyCategory.ROAD_ACCIDENT;
    }
    if (cleaned.includes('medic') || cleaned.includes('health') || cleaned.includes('cardiac')) {
      return EmergencyCategory.MEDICAL;
    }
    if (cleaned.includes('flood') || cleaned.includes('water')) return EmergencyCategory.FLOOD;
    if (cleaned.includes('building') || cleaned.includes('structure') || cleaned.includes('collapse')) {
      return EmergencyCategory.BUILDING_COLLAPSE;
    }
    return EmergencyCategory.OTHER;
  }

  /**
   * Normalizes people bracket string
   */
  normalizePeopleBracket(rawBracket: string): { bracket: string; numericCount: number } {
    const b = (rawBracket || '1').trim();
    if (b === '1' || b === '1 Person') return { bracket: '1', numericCount: 1 };
    if (b === '2-5' || b.includes('2')) return { bracket: '2-5', numericCount: 3 };
    if (b === '6-10' || b.includes('6')) return { bracket: '6-10', numericCount: 8 };
    if (b === '10+' || b.includes('10') || b.includes('more')) return { bracket: '10+', numericCount: 15 };
    return { bracket: '1', numericCount: 1 };
  }

  /**
   * Evaluates smart rule-based emergency severity:
   * Total Score = Category Score + People Affected Score
   * Keywords escalate severity to Critical
   */
  calculateSeverity(
    category: EmergencyCategory,
    peopleBracket: string,
    title: string,
    description: string,
  ): SeverityCalculationResult {
    const categoryScore = this.CATEGORY_SCORES[category] ?? 1;
    const peopleScore = this.PEOPLE_BRACKET_SCORES[peopleBracket] ?? 0;
    const totalScore = categoryScore + peopleScore;

    const searchableText = `${title || ''} ${description || ''}`.toLowerCase();
    const matchedKeywords = this.CRITICAL_KEYWORDS.filter((kw) =>
      searchableText.includes(kw),
    );

    let suggestedSeverity: SeverityLevel = SeverityLevel.LOW;
    const hasCriticalKeyword = matchedKeywords.length > 0;

    if (hasCriticalKeyword || totalScore >= 7) {
      suggestedSeverity = SeverityLevel.CRITICAL;
    } else if (totalScore >= 5) {
      suggestedSeverity = SeverityLevel.HIGH;
    } else if (totalScore >= 3) {
      suggestedSeverity = SeverityLevel.MEDIUM;
    } else {
      suggestedSeverity = SeverityLevel.LOW;
    }

    const isKeywordEscalated = hasCriticalKeyword && totalScore < 7;

    return {
      suggestedSeverity,
      categoryScore,
      peopleScore,
      totalScore,
      matchedKeywords,
      isKeywordEscalated,
    };
  }
}
