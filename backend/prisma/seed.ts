import { PrismaClient, EmergencyCategory, SeverityLevel, IncidentStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting UYRA Database Seeding ---');

  // 1. Seed Administrator
  const adminEmail = 'admin@uyra.org';
  const existingAdmin = await prisma.admin.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('UyraEmergency2026!', 10);
    const admin = await prisma.admin.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'UYRA Central Emergency Admin',
        role: 'SUPER_ADMIN',
      },
    });
    console.log(`Seeded default administrator: ${admin.email}`);
  } else {
    console.log(`Administrator ${adminEmail} already exists.`);
  }

  // 2. Seed Initial Incidents if table is empty
  const incidentCount = await prisma.incident.count();
  if (incidentCount === 0) {
    console.log('Seeding initial emergency incidents...');

    const initialIncidents = [
      {
        referenceNumber: 'UYRA-2026-9042',
        title: 'Multi-Storey Commercial Structure Partial Wall Collapse',
        description:
          'Scaffolding and eastern load-bearing facade collapsed onto the pedestrian walkway. Dust cloud visible; at least 7 bystanders and shop workers reported trapped near ground floor entrance.',
        category: EmergencyCategory.BUILDING_COLLAPSE,
        peopleBracket: '6-10',
        peopleCount: 8,
        contactName: 'Rohan Deshmukh',
        contactPhone: '+1 (555) 234-8910',
        latitude: 37.7812,
        longitude: -122.4115,
        accuracy: 8,
        address: '840 Market St & 4th Ave, Downtown Sector',
        suggestedSeverity: SeverityLevel.CRITICAL,
        confirmedSeverity: SeverityLevel.CRITICAL,
        categoryScore: 4,
        peopleScore: 2,
        totalScore: 6,
        matchedKeywords: ['collapse', 'trapped'],
        isKeywordEscalated: true,
        status: IncidentStatus.IN_PROGRESS,
        createdAt: new Date(Date.now() - 8 * 60 * 1000),
        statusHistory: [
          {
            previousStatus: null,
            newStatus: IncidentStatus.PENDING,
            updatedBy: 'System (Public SOS Portal)',
            note: 'SOS submitted with high-accuracy GPS lock (±8m).',
            createdAt: new Date(Date.now() - 8 * 60 * 1000),
          },
          {
            previousStatus: IncidentStatus.PENDING,
            newStatus: IncidentStatus.IN_PROGRESS,
            updatedBy: 'Admin Supervisor (M. Vance)',
            note: 'Coordinating with municipal heavy rescue & fire command.',
            createdAt: new Date(Date.now() - 5 * 60 * 1000),
          },
        ],
      },
      {
        referenceNumber: 'UYRA-2026-9041',
        title: 'Transformer Fire & Thick Black Smoke Near Transit Hub',
        description:
          'Electrical substation transformer caught fire with loud arcing sounds. Flames spreading to adjacent dry brush near the commuter parking lot.',
        category: EmergencyCategory.FIRE,
        peopleBracket: '2-5',
        peopleCount: 3,
        contactName: 'Elena Rostova',
        contactPhone: '+1 (555) 872-3319',
        latitude: 37.7895,
        longitude: -122.4018,
        accuracy: 12,
        address: '210 Mission Blvd, North Transit Plaza',
        suggestedSeverity: SeverityLevel.CRITICAL,
        confirmedSeverity: SeverityLevel.CRITICAL,
        categoryScore: 3,
        peopleScore: 1,
        totalScore: 4,
        matchedKeywords: ['fire', 'flames'],
        isKeywordEscalated: false,
        status: IncidentStatus.PENDING,
        createdAt: new Date(Date.now() - 14 * 60 * 1000),
        statusHistory: [
          {
            previousStatus: null,
            newStatus: IncidentStatus.PENDING,
            updatedBy: 'System (Public SOS Portal)',
            note: 'High-voltage fire alert transmitted with GPS fix.',
            createdAt: new Date(Date.now() - 14 * 60 * 1000),
          },
        ],
      },
      {
        referenceNumber: 'UYRA-2026-9038',
        title: 'Multi-Vehicle Rear-End Collision Blocking Westbound Lanes',
        description:
          'Three passenger cars involved in a fender-bender during wet road conditions. Minor airbag deployment, passengers walking around safely on shoulder.',
        category: EmergencyCategory.ROAD_ACCIDENT,
        peopleBracket: '2-5',
        peopleCount: 3,
        contactName: 'Anonymous Reporter',
        contactPhone: null,
        latitude: 37.7681,
        longitude: -122.4092,
        accuracy: 18,
        address: 'Interstate 80 Ramp & Bryant St Overpass',
        suggestedSeverity: SeverityLevel.MEDIUM,
        confirmedSeverity: SeverityLevel.MEDIUM,
        categoryScore: 2,
        peopleScore: 1,
        totalScore: 3,
        matchedKeywords: [],
        isKeywordEscalated: false,
        status: IncidentStatus.IN_PROGRESS,
        createdAt: new Date(Date.now() - 42 * 60 * 1000),
        statusHistory: [
          {
            previousStatus: null,
            newStatus: IncidentStatus.PENDING,
            updatedBy: 'System (Public SOS Portal)',
            note: 'Incident logged with GPS coordinates.',
            createdAt: new Date(Date.now() - 42 * 60 * 1000),
          },
          {
            previousStatus: IncidentStatus.PENDING,
            newStatus: IncidentStatus.IN_PROGRESS,
            updatedBy: 'Admin Dispatcher (K. Patel)',
            note: 'Traffic management notified for lane clearance.',
            createdAt: new Date(Date.now() - 35 * 60 * 1000),
          },
        ],
      },
      {
        referenceNumber: 'UYRA-2026-9032',
        title: 'Storm Drain Overflow & Flash Flooding in Underpass',
        description:
          'Rising water level (approx 2 feet) pooling under the railway viaduct. One sedan stalled at the edge; occupants exited safely to high ground.',
        category: EmergencyCategory.FLOOD,
        peopleBracket: '2-5',
        peopleCount: 3,
        contactName: 'Priya Nair',
        contactPhone: '+1 (555) 601-4491',
        latitude: 37.7649,
        longitude: -122.431,
        accuracy: 14,
        address: '17th St Lower Viaduct Underpass',
        suggestedSeverity: SeverityLevel.MEDIUM,
        confirmedSeverity: SeverityLevel.LOW,
        categoryScore: 2,
        peopleScore: 1,
        totalScore: 3,
        matchedKeywords: [],
        isKeywordEscalated: false,
        status: IncidentStatus.RESOLVED,
        createdAt: new Date(Date.now() - 116 * 60 * 1000),
        statusHistory: [
          {
            previousStatus: null,
            newStatus: IncidentStatus.PENDING,
            updatedBy: 'System (Public SOS Portal)',
            note: 'Initial report received.',
            createdAt: new Date(Date.now() - 116 * 60 * 1000),
          },
          {
            previousStatus: IncidentStatus.PENDING,
            newStatus: IncidentStatus.IN_PROGRESS,
            updatedBy: 'Admin Supervisor (M. Vance)',
            note: 'Public works drainage crew alerted.',
            createdAt: new Date(Date.now() - 100 * 60 * 1000),
          },
          {
            previousStatus: IncidentStatus.IN_PROGRESS,
            newStatus: IncidentStatus.RESOLVED,
            updatedBy: 'Admin Supervisor (M. Vance)',
            note: 'Drain cleared and roadway reopened.',
            createdAt: new Date(Date.now() - 30 * 60 * 1000),
          },
        ],
      },
    ];

    for (const inc of initialIncidents) {
      const { statusHistory, ...incData } = inc;
      const created = await prisma.incident.create({
        data: incData,
      });

      for (const history of statusHistory) {
        await prisma.incidentStatusHistory.create({
          data: {
            ...history,
            incidentId: created.id,
          },
        });
      }
    }

    console.log(`Successfully seeded ${initialIncidents.length} emergency incidents.`);
  }

  console.log('--- UYRA Database Seeding Completed ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
