import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "./config";
import { Pool } from "pg";
// ─────────────────────────────────────────────────────────────
// Client Prisma singleton — CORRECTIF COMPATIBILITÉ TERMUX : le moteur
// binaire natif de Prisma (Rust, .so) est compilé pour Linux glibc et ne
// s'exécute pas sur la libc d'Android (bionic) qu'utilise Termux, même en
// arm64 ("EM_AARCH64 (183) instead of EM_X86_64 (62)" / l'inverse selon
// l'engine téléchargé — dans tous les cas incompatible).
//
// On utilise donc l'adapter driver "@prisma/adapter-pg" (requiert
// previewFeatures = ["driverAdapters"] dans schema.prisma) : les requêtes
// passent par le driver `pg`, en JavaScript pur, sans binaire natif à
// charger. Ça fonctionne aussi bien sous Termux qu'ailleurs.
//
// ⚠️ Les migrations (`prisma migrate`) utilisent, elles, un autre binaire
// (le "schema engine") qui a le même problème sur Termux. Lancez
// `npm run db:migrate` / `db:migrate:deploy` depuis un environnement
// Linux/macOS/Windows classique (votre PC, ou ce container) — une fois les
// tables créées sur Supabase, le serveur applicatif (ce fichier) tourne
// sans souci sur Termux, lui, grâce à l'adapter.
// ─────────────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createClient(): PrismaClient {
  const pool = new Pool({ connectionString: config.databaseUrl });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: ["error", "warn"],
  });
}

export const prisma = global.__prisma ?? createClient();

if (config.nodeEnv !== "production") {
  global.__prisma = prisma;
}
