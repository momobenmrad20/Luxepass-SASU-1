import { prisma } from "../prisma";
import { encryptSensitiveData, decryptSensitiveData } from "../services/encryption.service";

// ─────────────────────────────────────────────────────────────
// Store pour la table identity_documents : isole les données sensibles
// (partie identité de guestData à chiffrer + signatureDataUrl) hors de
// checkin_sessions, chiffrées AES-256-GCM, avec rétention 6 mois.
// Même convention que checkinStore.ts : méthodes async, try/catch pour
// P2025 (enregistrement inexistant lors d'un update/delete).
// ─────────────────────────────────────────────────────────────

export interface IdentityDocumentRecord {
  id: string;
  checkinSessionId: string;
  hotelId: string;
  encryptedGuestData: string | null;
  encryptedSignature: string | null;
  encryptionKeyVersion: number;
  createdAt: Date;
  retentionUntil: Date;
  purgedAt: Date | null;
}

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

export const identityDocumentStore = {
  // ── Étape "guest-data" (PATCH /checkin-sessions/:sessionToken/guest-data) ──
  // Le check-in arrive en plusieurs étapes (guest-data, puis signature, puis
  // complétion) : on upsert au fur et à mesure plutôt que d'exiger tout d'un
  // coup. retentionUntil est provisoire ici (posée à titre conservatoire dès
  // la 1ère écriture) — finalizeRetention() la recale sur completedAt réel.
  async upsertSensitiveGuestData(
    checkinSessionId: string,
    hotelId: string,
    sensitiveGuestData: Record<string, unknown>
  ): Promise<IdentityDocumentRecord> {
    const encryptedGuestData = encryptSensitiveData(JSON.stringify(sensitiveGuestData));
    const rec = await prisma.identityDocument.upsert({
      where: { checkinSessionId },
      create: {
        checkinSessionId,
        hotelId,
        encryptedGuestData,
        retentionUntil: new Date(Date.now() + SIX_MONTHS_MS),
      },
      update: { encryptedGuestData },
    });
    return rec as IdentityDocumentRecord;
  },

  // ── Étape "signature" (POST /checkin-sessions/:sessionToken/signature) ──
  async upsertSignature(
    checkinSessionId: string,
    hotelId: string,
    signatureDataUrl: string
  ): Promise<IdentityDocumentRecord> {
    const encryptedSignature = encryptSensitiveData(signatureDataUrl);
    const rec = await prisma.identityDocument.upsert({
      where: { checkinSessionId },
      create: {
        checkinSessionId,
        hotelId,
        encryptedSignature,
        retentionUntil: new Date(Date.now() + SIX_MONTHS_MS),
      },
      update: { encryptedSignature },
    });
    return rec as IdentityDocumentRecord;
  },

  // ── Étape "complétion" (checkinStore.completeAndIssueStay) ──
  // Recale la rétention légale sur la date réelle de complétion du check-in
  // (fiche police = 6 mois à partir de là, pas depuis le 1er brouillon saisi).
  // Ne fait rien si aucune ligne n'existe encore (aucune donnée sensible saisie).
  async finalizeRetention(
    checkinSessionId: string,
    completedAt: Date
  ): Promise<IdentityDocumentRecord | undefined> {
    try {
      const rec = await prisma.identityDocument.update({
        where: { checkinSessionId },
        data: { retentionUntil: new Date(completedAt.getTime() + SIX_MONTHS_MS) },
      });
      return rec as IdentityDocumentRecord;
    } catch {
      return undefined; // P2025 : pas de ligne à finaliser
    }
  },

  async getByCheckinSessionId(
    checkinSessionId: string
  ): Promise<IdentityDocumentRecord | undefined> {
    const rec = await prisma.identityDocument.findUnique({ where: { checkinSessionId } });
    return (rec as IdentityDocumentRecord) ?? undefined;
  },

  // Déchiffre à la demande — à réserver aux routes staff protégées par
  // requireRole (voir pms.routes.ts). Retourne null si purgé ou absent.
  async getDecrypted(checkinSessionId: string): Promise<{
    sensitiveGuestData: Record<string, unknown> | null;
    signatureDataUrl: string | null;
  } | undefined> {
    const rec = await this.getByCheckinSessionId(checkinSessionId);
    if (!rec) return undefined;

    return {
      sensitiveGuestData: rec.encryptedGuestData
        ? JSON.parse(decryptSensitiveData(rec.encryptedGuestData))
        : null,
      signatureDataUrl: rec.encryptedSignature
        ? decryptSensitiveData(rec.encryptedSignature)
        : null,
    };
  },

  // Utilisé par le job de purge (src/jobs/purge-identity-documents.job.ts).
  async listExpiredUnpurged(now: Date = new Date()): Promise<IdentityDocumentRecord[]> {
    return prisma.identityDocument.findMany({
      where: { retentionUntil: { lte: now }, purgedAt: null },
    }) as Promise<IdentityDocumentRecord[]>;
  },

  async purgeMany(ids: string[], now: Date = new Date()): Promise<number> {
    const result = await prisma.identityDocument.updateMany({
      where: { id: { in: ids } },
      data: { encryptedGuestData: null, encryptedSignature: null, purgedAt: now },
    });
    return result.count;
  },
};
