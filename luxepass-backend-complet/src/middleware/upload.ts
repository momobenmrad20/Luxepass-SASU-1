import multer from "multer";
import { config } from "../config";
import { ValidationError } from "../utils/errors";

// ─────────────────────────────────────────────────────────────
// Le fichier de scan (passeport/CIN) est validé ici — pas par
// Zod — comme précisé dans schemas_zod_phase0.ts:
// "Le fichier lui-même est validé au niveau middleware multipart"
// ─────────────────────────────────────────────────────────────

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export const uploadIdScan = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.upload.maxUploadMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      return cb(
        new ValidationError([
          { message: `Type de fichier non autorisé: ${file.mimetype}` },
        ])
      );
    }
    cb(null, true);
  },
}).single("idDocument");
