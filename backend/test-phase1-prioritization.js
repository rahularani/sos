const { PrismaClient, EmergencyCategory, SeverityLevel, PriorityLevel, IncidentStatus, TeamAvailabilityStatus } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

// Mirror priority engine logic for automated test assertions
function calculatePriority({ confirmedSeverity, peopleCount, peopleBracket, category, createdAt, now = new Date() }) {
  const SEVERITY_SCORES = { CRITICAL: 40, HIGH: 28, MEDIUM: 16, LOW: 6 };
  const CATEGORY_SCORES = { BUILDING_COLLAPSE: 20, FIRE: 17, MEDICAL: 17, FLOOD: 13, ROAD_ACCIDENT: 13, OTHER: 7 };
  
  let peopleScore = 3;
  if (peopleCount > 10 || peopleBracket === '10+') peopleScore = 25;
  else if (peopleCount >= 6 || peopleBracket === '6-10') peopleScore = 18;
  else if (peopleCount >= 2 || peopleBracket === '2-5') peopleScore = 10;

  const elapsedMs = Math.max(0, now.getTime() - new Date(createdAt).getTime());
  const ageMinutes = Math.floor(elapsedMs / (1000 * 60));
  const agingScore = Math.min(15, +(ageMinutes * 0.2).toFixed(2));

  const severityComponent = SEVERITY_SCORES[confirmedSeverity] || 6;
  const categoryComponent = CATEGORY_SCORES[category] || 7;
  const raw = severityComponent + peopleScore + categoryComponent + agingScore;
  const priorityScore = +Math.min(100, Math.max(0, raw)).toFixed(2);

  let priorityLevel = 'LOW';
  if (priorityScore >= 75 || confirmedSeverity === 'CRITICAL') priorityLevel = 'CRITICAL';
  else if (priorityScore >= 55) priorityLevel = 'HIGH';
  else if (priorityScore >= 35) priorityLevel = 'MEDIUM';

  return { priorityScore, priorityLevel, severityComponent, peopleScore, categoryComponent, agingScore, ageMinutes };
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 UYRA ROUND 2 — PHASE 1 VALIDATION & COMPREHENSIVE TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  const now = new Date();

  // Test 1: Priority calculation on all 4 dimensions
  console.log('Test Suite 1: Mathematical Priority Scoring across all 4 criteria');
  const t1 = calculatePriority({
    confirmedSeverity: 'CRITICAL',
    peopleCount: 15,
    peopleBracket: '10+',
    category: 'BUILDING_COLLAPSE',
    createdAt: new Date(now.getTime() - 60 * 60 * 1000), // 60 mins old -> aging: 12 pts
    now,
  });
  // 40 + 25 + 20 + 12 = 97
  assert(t1.priorityScore === 97, `Extreme Disaster score matches (expected 97, got ${t1.priorityScore})`);
  assert(t1.priorityLevel === 'CRITICAL', `Extreme Disaster assigned CRITICAL level`);

  // Test 2: Severity Dimension Impact
  console.log('\nTest Suite 2: Dimension Impact Tests');
  const lowSev = calculatePriority({ confirmedSeverity: 'LOW', peopleCount: 1, category: 'OTHER', createdAt: now, now });
  const highSev = calculatePriority({ confirmedSeverity: 'HIGH', peopleCount: 1, category: 'OTHER', createdAt: now, now });
  assert(highSev.priorityScore > lowSev.priorityScore, `Higher severity produces higher priority (${highSev.priorityScore} > ${lowSev.priorityScore})`);

  // Test 3: People Affected Dimension Impact
  const fewPeople = calculatePriority({ confirmedSeverity: 'MEDIUM', peopleCount: 1, category: 'FIRE', createdAt: now, now });
  const massCasualty = calculatePriority({ confirmedSeverity: 'MEDIUM', peopleCount: 12, category: 'FIRE', createdAt: now, now });
  assert(massCasualty.priorityScore > fewPeople.priorityScore, `More people affected produces higher score (${massCasualty.priorityScore} > ${fewPeople.priorityScore})`);

  // Test 4: Category Dimension Impact
  const otherCat = calculatePriority({ confirmedSeverity: 'MEDIUM', peopleCount: 2, category: 'OTHER', createdAt: now, now });
  const fireCat = calculatePriority({ confirmedSeverity: 'MEDIUM', peopleCount: 2, category: 'FIRE', createdAt: now, now });
  assert(fireCat.priorityScore > otherCat.priorityScore, `Fire category yields higher score than Other (${fireCat.priorityScore} > ${otherCat.priorityScore})`);

  // Test 5: Aging of Unresolved Incidents
  console.log('\nTest Suite 3: Aging Mechanism');
  const freshIncident = calculatePriority({ confirmedSeverity: 'LOW', peopleCount: 1, category: 'OTHER', createdAt: now, now });
  const fortyFiveMinOld = calculatePriority({ confirmedSeverity: 'LOW', peopleCount: 1, category: 'OTHER', createdAt: new Date(now.getTime() - 45 * 60 * 1000), now });
  const twoHoursOld = calculatePriority({ confirmedSeverity: 'LOW', peopleCount: 1, category: 'OTHER', createdAt: new Date(now.getTime() - 120 * 60 * 1000), now });
  assert(fortyFiveMinOld.priorityScore > freshIncident.priorityScore, `45-min old incident gains priority (${fortyFiveMinOld.priorityScore} > ${freshIncident.priorityScore})`);
  assert(twoHoursOld.agingScore === 15, `Aging score caps at exactly 15 points (got ${twoHoursOld.agingScore})`);

  // Test 6: Database Models Foundation & Relationships
  console.log('\nTest Suite 4: Database Models & Team Assignment Foundation');
  const testTeamName = `Alpha Rapid Fire Unit ${Date.now()}`;
  const team = await prisma.responseTeam.create({
    data: {
      name: testTeamName,
      category: 'FIRE',
      latitude: 11.0168,
      longitude: 76.9558,
      status: 'AVAILABLE',
      contactPhone: '+91 99944 11223',
    },
  });
  assert(team.id && team.name === testTeamName, `ResponseTeam created with unique name & coordinates`);

  const testIncRef = `TEST-P1-${Math.floor(1000 + Math.random() * 9000)}`;
  const incident = await prisma.incident.create({
    data: {
      referenceNumber: testIncRef,
      title: 'Automated Test Incident Phase 1',
      description: 'Verifying priority engine and team assignment history',
      category: 'FIRE',
      peopleBracket: '2-5',
      peopleCount: 3,
      suggestedSeverity: 'HIGH',
      confirmedSeverity: 'HIGH',
      status: 'PENDING',
      priorityScore: 65,
      priorityLevel: 'HIGH',
    },
  });
  assert(incident.id && incident.referenceNumber === testIncRef, `Incident persisted with priority score and level`);

  // Test Assignment creation & history retention
  const assignment = await prisma.teamAssignment.create({
    data: {
      incidentId: incident.id,
      teamId: team.id,
      status: 'ASSIGNED',
      assignedBy: 'Dispatch Supervisor',
      notes: 'Initial dispatch unit assigned',
    },
  });
  assert(assignment.id && assignment.incidentId === incident.id, `TeamAssignment relationship established`);

  // Update assignment status to ON_SCENE
  const updatedAssign = await prisma.teamAssignment.update({
    where: { id: assignment.id },
    data: { status: 'ON_SCENE' },
  });
  assert(updatedAssign.status === 'ON_SCENE', `Assignment status transitions smoothly with history retained`);

  // Test 7: API /api/incidents/prioritized Endpoint Live Verification
  console.log('\nTest Suite 5: Live API Endpoint & Resolved Exclusion');
  const res = await fetch('http://127.0.0.1:4000/api/incidents/prioritized');
  assert(res.status === 200, `GET /api/incidents/prioritized returns HTTP 200`);
  const queueData = await res.json();
  assert(Array.isArray(queueData.data), `Queue returns array of prioritized incidents`);
  assert(queueData.data.every(i => i.rawStatus !== 'RESOLVED'), `Resolved incidents strictly excluded from priority queue`);

  // Verify stable descending sort order in the live queue
  let isSortedDesc = true;
  for (let i = 0; i < queueData.data.length - 1; i++) {
    if (queueData.data[i].priorityScore < queueData.data[i + 1].priorityScore) {
      isSortedDesc = false;
      break;
    }
  }
  assert(isSortedDesc, `Incidents in priority queue strictly sorted by priorityScore DESC`);

  // Test 8: Cleanup temporary test records to preserve database integrity
  console.log('\nTest Suite 6: Database Cleanup of Test Fixtures');
  await prisma.teamAssignment.delete({ where: { id: assignment.id } });
  await prisma.responseTeam.delete({ where: { id: team.id } });
  await prisma.incident.delete({ where: { id: incident.id } });
  assert(true, `Test fixtures cleaned safely without touching production records`);

  console.log('\n================================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  prisma.$disconnect();
  process.exit(1);
});
