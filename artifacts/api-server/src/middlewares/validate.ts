import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /**
       * Express 5 made `req.query` a getter-only property (no setter),
       * so validated/coerced query params can't be written back onto
       * `req.query` directly — that throws
       * "Cannot set property query of #<IncomingMessage>". Validated
       * query params are stashed here instead.
       */
      validatedQuery?: Record<string, unknown>;
    }
  }
}

/**
 * Validates and coerces `req.body` / `req.query` / `req.params` against
 * the given Zod schemas (generated from the OpenAPI spec in
 * @workspace/api-zod). `body` and `params` are written back in place;
 * `query` is stashed on `req.validatedQuery` (see above) rather than
 * reassigning `req.query`. Validation failures throw ZodError, handled
 * centrally by the error-handler middleware.
 */
export function validate(schemas: {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (schemas.body) {
      req.body = schemas.body.parse(req.body);
    }
    if (schemas.query) {
      req.validatedQuery = schemas.query.parse(req.query) as Record<
        string,
        unknown
      >;
    }
    if (schemas.params) {
      req.params = schemas.params.parse(req.params) as typeof req.params;
    }
    next();
  };
}
