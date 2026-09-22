import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { Request, RequestHandler } from "express";
import {
  SCAN_ID_MAX_PER_IP,
  SCAN_ID_MAX_PER_KEY,
  createScanIdIpCeiling,
  createScanIdRateLimiter,
  normalizeIp,
  scanIdKey,
} from "./scanIdRateLimiter";

// ─────────────────────────────────────────────────────────────
// Tests de POST /checkin-sessions/:sessionToken/scan-id (rate limiting).
//
// Intégration : le VRAI express-rate-limit est monté dans une petite app
// Express, appelée en HTTP (fetch natif, comme requireStayAuth.test.ts).
// Aucune base ni API Anthropic : requireCheckinSession est remplacé par un
// faux garde, et le contrôleur OCR par un compteur (`ocrCalls`) — qui prouve
// qu'une requête refusée n'atteint JAMAIS l'OCR (donc ne coûte rien).
// `trust proxy` est activé pour simuler des IP différentes via X-Forwarded-For.
// Chaque test crée ses propres limiteurs (compteurs isolés).
//
// Lancer : npm test
// ─────────────────────────────────────────────────────────────

const EXPECTED_BODY = {
  error: "RATE_LIMIT_EXCEEDED",
  message:
    "Trop de tentatives de lecture de pièce d'identité. Veuillez patienter 15 minutes avant de réessayer.",
};

interface TestApp {
  base: string;
  ocrCalls: () => number;
  close: () => Promise<void>;
}

async function startApp(limiters: RequestHandler[]): Promise<TestApp> {
  const express = (await import("express")).default;
  const app = express();
  app.set("trust proxy", 1);

  let ocrCalls = 0;
  app.post(
    "/checkin-sessions/:sessionToken/scan-id",
    // Faux requireCheckinSession : le jeton "anon" = pas de session valide.
    (req, _res, next) => {
      const token = req.params.sessionToken;
      if (token !== "anon") {
        Object.assign(req, {
          checkinSession: {
            sessionId: token,
            hotelSlug: "oceana",
            stage: "started",
            type: "checkin_session",
          },
        });
      }
      next();
    },
    ...limiters,
    (_req, res) => {
      ocrCalls++;
      res.json({ stage: "scanned" });
    }
  );

  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  return {
    base: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    ocrCalls: () => ocrCalls,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

async function scan(app: TestApp, sessionToken: string, ip?: string) {
  const res = await fetch(`${app.base}/checkin-sessions/${sessionToken}/scan-id`, {
    method: "POST",
    headers: ip ? { "X-Forwarded-For": ip } : {},
  });
  return { status: res.status, headers: res.headers, body: (await res.json()) as unknown };
}

// ── Cas demandé : la 6e requête dans la fenêtre → 429 ────────

test("la 6e requête dans la fenêtre de 15 min renvoie 429 avec le JSON et les en-têtes attendus", async () => {
  const app = await startApp([createScanIdRateLimiter()]);
  try {
    for (let i = 1; i <= SCAN_ID_MAX_PER_KEY; i++) {
      const r = await scan(app, "session_A");
      assert.equal(r.status, 200, `requête ${i}`);
      assert.equal(r.headers.get("ratelimit-limit"), "5");
      assert.equal(r.headers.get("ratelimit-remaining"), String(SCAN_ID_MAX_PER_KEY - i));
    }

    const blocked = await scan(app, "session_A");
    assert.equal(blocked.status, 429);
    assert.deepEqual(blocked.body, EXPECTED_BODY);
    assert.equal(blocked.headers.get("ratelimit-limit"), "5");
    assert.equal(blocked.headers.get("ratelimit-remaining"), "0");

    const retryAfter = Number(blocked.headers.get("retry-after"));
    assert.ok(retryAfter > 0 && retryAfter <= 15 * 60, `Retry-After = ${retryAfter}`);

    // Les requêtes refusées n'ont jamais atteint l'OCR : 5 appels, pas 6.
    assert.equal(app.ocrCalls(), SCAN_ID_MAX_PER_KEY);
  } finally {
    await app.close();
  }
});

// ── Clé : séjour/session d'abord, IP en repli ────────────────

test("deux sessions distinctes depuis la même IP ont chacune leur propre quota", async () => {
  const app = await startApp([createScanIdRateLimiter()]);
  try {
    for (let i = 0; i < SCAN_ID_MAX_PER_KEY; i++) await scan(app, "session_A", "203.0.113.1");
    assert.equal((await scan(app, "session_A", "203.0.113.1")).status, 429);
    assert.equal((await scan(app, "session_B", "203.0.113.1")).status, 200);
  } finally {
    await app.close();
  }
});

test("le quota suit la session, pas l'IP : changer d'adresse ne remet pas le compteur à zéro", async () => {
  const app = await startApp([createScanIdRateLimiter()]);
  try {
    for (let i = 0; i < SCAN_ID_MAX_PER_KEY; i++) {
      assert.equal((await scan(app, "session_A", `198.51.100.${i + 1}`)).status, 200);
    }
    assert.equal((await scan(app, "session_A", "198.51.100.99")).status, 429);
  } finally {
    await app.close();
  }
});

test("sans session valide, repli sur l'IP : 5 requêtes puis 429, une autre IP reste libre", async () => {
  const app = await startApp([createScanIdRateLimiter()]);
  try {
    for (let i = 0; i < SCAN_ID_MAX_PER_KEY; i++) {
      assert.equal((await scan(app, "anon", "203.0.113.7")).status, 200);
    }
    const blocked = await scan(app, "anon", "203.0.113.7");
    assert.equal(blocked.status, 429);
    assert.deepEqual(blocked.body, EXPECTED_BODY);
    assert.equal((await scan(app, "anon", "203.0.113.8")).status, 200);
  } finally {
    await app.close();
  }
});

// ── Plafond IP : anti-contournement par création de sessions ─

test("plafond IP : des sessions neuves en rafale depuis une même IP finissent bloquées", async () => {
  const app = await startApp([createScanIdIpCeiling({ limit: 7 }), createScanIdRateLimiter()]);
  try {
    // Chaque session est neuve (1er scan) : le limiteur par session ne bloque
    // rien. Seul le plafond IP arrête la rafale.
    for (let i = 1; i <= 7; i++) {
      assert.equal((await scan(app, `session_${i}`, "192.0.2.10")).status, 200, `session ${i}`);
    }
    const blocked = await scan(app, "session_8", "192.0.2.10");
    assert.equal(blocked.status, 429);
    assert.deepEqual(blocked.body, EXPECTED_BODY);
    assert.equal(app.ocrCalls(), 7);

    // Un autre client (autre IP) n'est pas touché.
    assert.equal((await scan(app, "session_9", "192.0.2.11")).status, 200);
  } finally {
    await app.close();
  }
});

test("le plafond IP par défaut est bien plus large que le quota par session (NAT hôtelier)", () => {
  assert.ok(SCAN_ID_MAX_PER_IP >= 10 * SCAN_ID_MAX_PER_KEY);
});

// ── Fenêtre ──────────────────────────────────────────────────

test("le quota se libère à la fin de la fenêtre", async () => {
  const app = await startApp([createScanIdRateLimiter({ windowMs: 300 })]);
  try {
    for (let i = 0; i < SCAN_ID_MAX_PER_KEY; i++) await scan(app, "session_A");
    assert.equal((await scan(app, "session_A")).status, 429);

    await new Promise((resolve) => setTimeout(resolve, 450));
    assert.equal((await scan(app, "session_A")).status, 200);
  } finally {
    await app.close();
  }
});

// ── Fonctions pures ──────────────────────────────────────────

test("scanIdKey : priorité stayId > sessionId > IP, identifiants tronqués", () => {
  const req = (over: Record<string, unknown>) => ({ ip: "203.0.113.5", ...over }) as unknown as Request;

  assert.equal(
    scanIdKey(req({ staySession: { stayId: "stay_1" }, checkinSession: { sessionId: "cs_1" } })),
    "stay:stay_1"
  );
  assert.equal(scanIdKey(req({ checkinSession: { sessionId: "cs_1" } })), "session:cs_1");
  assert.equal(scanIdKey(req({})), "ip:203.0.113.5");
  assert.equal(scanIdKey(req({ ip: undefined })), "ip:unknown");
  assert.equal(scanIdKey(req({ checkinSession: { sessionId: "x".repeat(500) } })), `session:${"x".repeat(64)}`);
});

test("normalizeIp : IPv4 inchangée, IPv4 mappée dépouillée, IPv6 regroupée par /64", () => {
  assert.equal(normalizeIp("203.0.113.7"), "203.0.113.7");
  assert.equal(normalizeIp("::ffff:203.0.113.7"), "203.0.113.7");
  assert.equal(normalizeIp(undefined), "unknown");

  const block = "2001:0db8:0001:0002::/64";
  assert.equal(normalizeIp("2001:db8:1:2:3:4:5:6"), block);
  assert.equal(normalizeIp("2001:db8:1:2::1"), block);
  assert.equal(normalizeIp("2001:DB8:1:2:ffff:ffff:ffff:ffff"), block);
  assert.notEqual(normalizeIp("2001:db8:1:3::1"), block);

  assert.equal(normalizeIp("::1"), "0000:0000:0000:0000::/64");
  assert.equal(normalizeIp("2001:db8::1"), "2001:0db8:0000:0000::/64");
  assert.equal(normalizeIp("fe80::1%eth0"), "fe80:0000:0000:0000::/64");
  assert.equal(normalizeIp("64:ff9b::192.0.2.1"), "0064:ff9b:0000:0000::/64");
});

// ── Câblage : la route déclare bien les limiteurs, dans le bon ordre ──

test("checkin.routes.ts : limiteurs sur scan-id uniquement, entre requireCheckinSession et l'upload", () => {
  const src = fs.readFileSync(path.join(__dirname, "../routes/checkin.routes.ts"), "utf8");

  const start = src.indexOf('"/checkin-sessions/:sessionToken/scan-id"');
  assert.ok(start > -1, "route scan-id introuvable");
  const block = src.slice(start, src.indexOf("asyncHandler(", start));

  const at = (name: string) => block.indexOf(name);
  assert.ok(at("scanIdIpCeiling") > -1 && at("scanIdRateLimiter") > -1, "limiteurs absents de la route");
  assert.ok(at("scanIdIpCeiling") < at("requireCheckinSession"), "plafond IP avant l'auth de session");
  assert.ok(at("requireCheckinSession") < at("scanIdRateLimiter"), "limiteur strict APRÈS requireCheckinSession");
  assert.ok(at("scanIdRateLimiter") < at("uploadIdScan"), "limiteurs AVANT multer");

  // « Exclusivement » : une seule route les déclare (2 lignes d'arguments).
  const usages = src.split("\n").filter((l) => /^\s*(scanIdIpCeiling|scanIdRateLimiter),/.test(l));
  assert.equal(usages.length, 2);
});
