import { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";
import { AppError } from "../utils/errors";
import { config } from "../config";

// ─────────────────────────────────────────────────────────────
// Handler d'erreurs unique — toutes les routes lèvent des
// AppError (ou dérivées) attrapées ici, avec un format de
// réponse stable pour le front:
//   { error: "<code>", message: "...", details?: [...] }
// ─────────────────────────────────────────────────────────────

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  if (err instanceof MulterError) {
    return res.status(400).json({
      error: "upload_error",
      message: err.message,
    });
  }

  // Erreur non anticipée — on ne fuite pas la stack en prod
  // eslint-disable-next-line no-console
  console.error("[unhandled_error]", err);
  res.status(500).json({
    error: "internal_error",
    message:
      config.nodeEnv === "production"
        ? "Une erreur inattendue est survenue"
        : String((err as Error)?.stack ?? err),
  });
}
