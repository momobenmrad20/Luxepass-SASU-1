import { NextFunction, Request, Response } from "express";
import { ZodTypeAny } from "zod";
import { ValidationError } from "../utils/errors";

type Source = "body" | "params" | "query";

// ─────────────────────────────────────────────────────────────
// validate({ params, body, query }) — valide un ou plusieurs
// segments de la requête avec un schéma Zod, et remplace la
// valeur brute par la valeur parsée (coercions Zod appliquées,
// ex: guestDataFieldsSchema.age via z.coerce.number()).
// Une seule ValidationError agrège toutes les erreurs trouvées,
// comme suggéré en commentaire dans schemas_zod_phase0.ts.
// ─────────────────────────────────────────────────────────────

export function validate(schemas: Partial<Record<Source, ZodTypeAny>>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const allIssues: unknown[] = [];

    (Object.keys(schemas) as Source[]).forEach((source) => {
      const schema = schemas[source];
      if (!schema) return;
      const result = schema.safeParse(req[source]);
      if (!result.success) {
        allIssues.push(...result.error.issues.map((i) => ({ source, ...i })));
      } else {
        // req.query/params sont typés en lecture seule côté Express mais
        // réassignables au runtime ; on remplace par la valeur parsée/coercée.
        // @ts-ignore
        req[source] = result.data;
      }
    });

    if (allIssues.length > 0) {
      return next(new ValidationError(allIssues));
    }

    next();
  };
}
