import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearStaging() {
  console.log('Clearing all staging data from Supabase PostgreSQL...');
  const deletedHistory = await prisma.incidentStatusHistory.deleteMany({});
  console.log(`Deleted ${deletedHistory.count} status history entries.`);

  const deletedIncidents = await prisma.incident.deleteMany({});
  console.log(`Deleted ${deletedIncidents.count} incidents.`);

  console.log('Staging database cleared cleanly!');
}

clearStaging()
  .catch((e) => {
    console.error('Error clearing staging data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
