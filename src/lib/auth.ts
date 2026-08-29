import * as authSchema from "@/db/auth-schema";
import { db } from "@/db/client";
import { getOAuthAvailability } from "@/lib/auth-configuration";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { enqueueNewsletterSync } from "@/lib/newsletter-queue";
import { createBetterAuthRateLimitStorage } from "@/lib/redis/better-auth-rate-limit";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";

const oauthAvailability = getOAuthAvailability();

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
  rateLimit: {
    window: 60, // 60-second sliding window
    max: 100, // max requests per window (global)
    customStorage: createBetterAuthRateLimitStorage(),
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 5 },
      "/forget-password": { window: 60, max: 3 },
      "/reset-password": { window: 60, max: 5 },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    sendResetPassword: async ({ user, url, token }, request) => {
      await sendPasswordResetEmail({
        to: user.email,
        resetUrl: url,
      });
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url, token }, request) => {
      await sendVerificationEmail({
        to: user.email,
        verificationUrl: url,
      });
    },
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    afterEmailVerification: async (user, request) => {
      try {
        await db
          .update(authSchema.user)
          .set({ newsletterSubscribed: true })
          .where(eq(authSchema.user.id, user.id));
        await enqueueNewsletterSync(
          { userId: user.id, email: user.email },
          request?.url,
        );
      } catch (error) {
        logger.error(
          "Failed to enqueue newsletter sync after verification",
          error,
        );
      }
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  user: {
    deleteUser: {
      enabled: true,
      afterDelete: async (user, request) => {
        try {
          await enqueueNewsletterSync(
            { email: user.email, forceUnsubscribe: true },
            request?.url,
          );
        } catch (error) {
          logger.error(
            "Failed to enqueue newsletter unsubscribe on delete",
            error,
          );
        }
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          if (!user?.emailVerified) return;
          try {
            await enqueueNewsletterSync({ userId: user.id, email: user.email });
          } catch (error) {
            logger.error("Failed to enqueue newsletter sync", error);
          }
        },
      },
    },
  },
  socialProviders: {
    ...(oauthAvailability.google
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            prompt: "select_account",
          },
        }
      : {}),
    ...(oauthAvailability.github
      ? {
          github: {
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
          },
        }
      : {}),
    ...(oauthAvailability.huggingface
      ? {
          huggingface: {
            clientId: process.env.HUGGINGFACE_CLIENT_ID!,
            clientSecret: process.env.HUGGINGFACE_CLIENT_SECRET!,
          },
        }
      : {}),
  },
  plugins: [nextCookies()],
});
