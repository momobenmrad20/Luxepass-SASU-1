// ─────────────────────────────────────────────────────────────
// Erreurs applicatives — chaque erreur connaît son propre code
// HTTP et son "error code" métier stable (utilisé par le front).
// ─────────────────────────────────────────────────────────────

export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(details: unknown) {
    super(400, "validation_error", "Payload invalide", details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Non authentifié") {
    super(401, "unauthorized", message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Accès refusé") {
    super(403, "forbidden", message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Ressource") {
    super(404, "not_found", `${resource} introuvable`);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, "conflict", message);
  }
}

export class SessionExpiredError extends AppError {
  constructor() {
    super(401, "session_expired", "La session de check-in a expiré");
  }
}

// ─────────────────────────────────────────────────────────────
// Token de séjour (stayToken) — codes métier stables, distincts du
// "unauthorized" générique du staff pour que le front sache qu'il doit
// abandonner le séjour local (et non tenter un refresh staff).
//   stay_token_missing   401 — ni X-Stay-Token ni Authorization: Bearer
//   stay_token_invalid   401 — signature/format/algorithme/type invalides
//   stay_token_expired   401 — exp dépassé
// Un token valide mais émis pour un AUTRE séjour est un 403 "forbidden"
// (ForbiddenError, cf. requireStayAuth).
// ─────────────────────────────────────────────────────────────
export class StayTokenError extends AppError {
  constructor(
    code: "stay_token_missing" | "stay_token_invalid" | "stay_token_expired",
    message: string
  ) {
    super(401, code, message);
  }
}

// CORRECTIF (renouvellement indéfini du pass) : levée par signStayToken
// quand le plafond absolu `createdAt + STAY_TOKEN_ABSOLUTE_MAX_DAYS` est
// dépassé. Pas destinée à remonter telle quelle au client : GET /pass
// l'attrape et répond `stayToken: null` (même comportement que pour un
// séjour `checked_out` — le pass reste lisible, plus aucun accès n'est
// réémis). Voir stay.routes.ts.
export class StayTokenAbsoluteCapError extends Error {}
