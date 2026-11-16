// env validation runs as a side effect of this import (see
// config/env.ts) — deliberately the very first thing this process
// does, before touching the database, Redis, or Express, so
// misconfiguration fails fast with a clear message instead of a
// confusing downstream error.
import { env, isHostedRuntime, isProd } from "./config/env";
import app from "./app";
import { logger } from "./lib/logger";
import { startTaskReminderScheduler } from "./services/task-reminders.service";
import { startTaskReminderEmailOutboxWorker } from "./services/task-reminder-email-outbox.service";
import { isEmailDeliveryConfigured, verifyEmailTransport } from "./services/email.service";

app.listen(env.PORT, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({
    port: env.PORT,
    env: env.NODE_ENV,
    hostedRuntime: isHostedRuntime,
    productionGuardsEnabled: isProd,
    smsProvider: env.SMS_PROVIDER,
    smtpConfigured: isEmailDeliveryConfigured(),
    hasSessionSecret: Boolean(env.SESSION_SECRET),
    hasOtpSecret: Boolean(env.OTP_SECRET),
    hasPasswordResetSecret: Boolean(env.PASSWORD_RESET_SECRET),
  }, "Server listening");
  if (isHostedRuntime && env.NODE_ENV !== "production") {
    logger.warn("Hosted runtime is not setting NODE_ENV=production; production environment validation is bypassed.");
  }
  if (isHostedRuntime && !isEmailDeliveryConfigured()) {
    logger.warn("SMTP is not configured; outbound email will fail closed in this hosted runtime.");
  }
  if (isHostedRuntime && env.SMS_PROVIDER === "mock") {
    logger.warn("SMS_PROVIDER=mock cannot deliver OTPs in a hosted runtime; configure a real SMS provider.");
  }
  startTaskReminderScheduler();
  startTaskReminderEmailOutboxWorker();
  if (isEmailDeliveryConfigured()) {
    void verifyEmailTransport().then((verified) => {
      if (verified) logger.info("SMTP transport verified");
    });
  }
});
