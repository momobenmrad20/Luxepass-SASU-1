import bcrypt from "bcryptjs";
import { prisma } from "../src/prisma";

// ─────────────────────────────────────────────────────────────
// Seed de démonstration — reprend exactement les données qui étaient
// codées en dur dans l'ancien memoryStore.ts (seed() au démarrage du
// process). Lancer avec: npm run db:seed
//
// CORRECTIF (README §4.3/§12, P1) : la version d'origine utilisait
// `new PrismaClient()` (moteur natif Rust), qui n'accepte pas
// `sslmode=no-verify` sur DATABASE_URL — le seed échouait donc en
// développement (Supabase). On réutilise désormais le même client que
// le serveur (src/prisma.ts, adapter @prisma/adapter-pg, JS pur).
//
// ⚠️ Les mots de passe de démo ("password123") sont volontairement
// faibles et NE DOIVENT JAMAIS être utilisés en production. Changez-les
// (ou supprimez ces comptes) avant d'ouvrir l'accès à de vrais membres
// du staff Oceana.
// ─────────────────────────────────────────────────────────────

async function main() {
  const hotel = await prisma.hotel.upsert({
    where: { id: "hotel_ocean_asuites" },
    update: {},
    create: {
      id: "hotel_ocean_asuites",
      slug: "oceana", // aligné sur HOTELS[0].id du frontend
      name: "Ocean A Suites",
    },
  });

  const demoPasswordHash = await bcrypt.hash("password123", 10);

  await prisma.staff.upsert({
    where: { email: "reception@ocean-a-suites.tn" },
    update: {},
    create: {
      id: "staff_demo_reception",
      email: "reception@ocean-a-suites.tn",
      passwordHash: demoPasswordHash,
      hotelId: hotel.id,
      role: "reception",
      name: "Réception (démo)",
    },
  });

  await prisma.staff.upsert({
    where: { email: "gm@ocean-a-suites.tn" },
    update: {},
    create: {
      id: "staff_demo_gm",
      email: "gm@ocean-a-suites.tn",
      passwordHash: demoPasswordHash,
      hotelId: hotel.id,
      role: "gm",
      name: "Directeur Général (démo)",
    },
  });

  console.log("Seed OK — hôtel:", hotel.slug);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
