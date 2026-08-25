// env validation runs as a side effect of this import (see
// config/env.ts) — deliberately the very first thing this process
// does, before touching the database, Redis, or Express, so
// misconfiguration fails fast with a clear message instead of a
// confusing downstream error.
import { env } from "./config/env";
import app from "./app";
import { logger } from "./lib/logger";

app.listen(env.PORT, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port: env.PORT, env: env.NODE_ENV }, "Server listening");
});
