import { PrismaClient } from "@prisma/client";

import { reverseGeocode } from "../src/lib/geocoding";

const prisma = new PrismaClient();

async function main() {
  const pending = await prisma.timeRecord.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
      locationAddress: null,
    },
    orderBy: { serverTimestamp: "asc" },
  });

  console.log(`Backfill iniciado para ${pending.length} registro(s).`);

  let updated = 0;

  for (const record of pending) {
    const latitude = record.latitude ? Number(record.latitude) : undefined;
    const longitude = record.longitude ? Number(record.longitude) : undefined;
    const result = await reverseGeocode(latitude, longitude);

    if (!result) {
      continue;
    }

    await prisma.timeRecord.update({
      where: { id: record.id },
      data: {
        locationAddress: result.addressText,
        geocodingProvider: result.provider,
      },
    });

    updated += 1;
    console.log(`Atualizado: ${record.id}`);
  }

  console.log(`Backfill concluido. ${updated} registro(s) atualizado(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
