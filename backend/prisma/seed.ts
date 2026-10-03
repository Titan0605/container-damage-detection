import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
try {
  // Explicitly opt-in, repeatable demo data. Never deletes existing reports or sends SMS.
  for (let day = 0; day < 30; day++) {
    for (let scan = 0; scan < 8 + (day % 9); scan++) {
      const index = day * 100 + scan;
      const id = `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
      const timestamp = new Date();
      timestamp.setUTCDate(timestamp.getUTCDate() - day);
      timestamp.setUTCMinutes(timestamp.getUTCMinutes() - scan * 2);
      const type = ['rust', 'dent', 'hole'][index % 3] ?? 'rust';
      await db.containerReport.upsert({
        where: { id },
        update: {},
        create: {
          id,
          serial_number: `DEMO${String(1000000 + scan)}`,
          timestamp,
          damages: {
            create:
              scan % 4 === 0 ? [{ damage_type: type, confidence: 0.85 + (scan % 10) / 100 }] : [],
          },
        },
      });
    }
  }
  console.info('Datos DEMO creados.');
} finally {
  await db.$disconnect();
}
