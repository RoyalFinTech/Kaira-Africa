import { env, isProd } from "../config/env";
import { logger } from "../lib/logger";

export interface SmsProvider {
  name: string;
  send(input: { to: string; message: string }): Promise<void>;
}

/**
 * Logs instead of sending — this is what SMS_PROVIDER=mock (the
 * default) uses. Appropriate for development and staging smoke tests;
 * never for production (env.ts's production schema still allows
 * SMS_PROVIDER=mock to boot, since that's a valid staging config, but
 * a real deployment should set SMS_PROVIDER to a real provider).
 */
class MockSmsProvider implements SmsProvider {
  name = "mock";
  async send(input: { to: string; message: string }): Promise<void> {
    logger.info({ to: input.to }, `[MOCK SMS] ${input.message}`);
  }
}

/**
 * Africa's Talking is a common SMS gateway for Gambian/West African
 * numbers. This is a real HTTP integration (not a stub) — it just
 * requires SMS_API_KEY to actually be a valid Africa's Talking API
 * key to succeed at runtime. Swap/extend with more providers by
 * implementing SmsProvider and adding a case below.
 */
class AfricasTalkingSmsProvider implements SmsProvider {
  name = "africastalking";
  private readonly apiKey: string;
  private readonly senderId: string;

  constructor(apiKey: string, senderId: string) {
    this.apiKey = apiKey;
    this.senderId = senderId;
  }

  async send(input: { to: string; message: string }): Promise<void> {
    const response = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        apiKey: this.apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        username: this.senderId,
        to: input.to,
        message: input.message,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Africa's Talking SMS send failed (${response.status}): ${body}`);
    }
  }
}

class TwilioSmsProvider implements SmsProvider {
  name = "twilio";
  private readonly apiKey: string;
  private readonly senderId: string;

  constructor(apiKey: string, senderId: string) {
    this.apiKey = apiKey;
    this.senderId = senderId;
  }

  async send(input: { to: string; message: string }): Promise<void> {
    // apiKey is expected as "accountSid:authToken" for Basic auth.
    const auth = Buffer.from(this.apiKey).toString("base64");
    const [accountSid] = this.apiKey.split(":");
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: this.senderId,
          To: input.to,
          Body: input.message,
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Twilio SMS send failed (${response.status}): ${body}`);
    }
  }
}

function buildProvider(): SmsProvider {
  switch (env.SMS_PROVIDER) {
    case "africastalking":
      if (!env.SMS_API_KEY || !env.SMS_SENDER_ID) {
        throw new Error("SMS_API_KEY and SMS_SENDER_ID are required for SMS_PROVIDER=africastalking");
      }
      return new AfricasTalkingSmsProvider(env.SMS_API_KEY, env.SMS_SENDER_ID);
    case "twilio":
      if (!env.SMS_API_KEY || !env.SMS_SENDER_ID) {
        throw new Error("SMS_API_KEY and SMS_SENDER_ID are required for SMS_PROVIDER=twilio");
      }
      return new TwilioSmsProvider(env.SMS_API_KEY, env.SMS_SENDER_ID);
    case "mock":
    default:
      if (isProd) {
        logger.warn(
          "SMS_PROVIDER=mock in production — OTPs will be logged, not actually sent. This is only appropriate for staging.",
        );
      }
      return new MockSmsProvider();
  }
}

export const smsProvider: SmsProvider = buildProvider();

export async function sendOtpSms(input: { to: string; code: string }): Promise<void> {
  await smsProvider.send({
    to: input.to,
    message: `Your Kaira Africa verification code is ${input.code}. It expires in 5 minutes.`,
  });
}
