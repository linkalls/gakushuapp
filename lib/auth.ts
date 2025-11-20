import { db } from "@/lib/db/drizzle";
import { decks, studySessions, tags } from "@/lib/db/drizzle-schema";
import { stripe } from "@better-auth/stripe";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { anonymous } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

// Use a dummy key for build/dev if not present.
// In production, this should be present.
const stripeKey = process.env.STRIPE_SECRET_KEY || "sk_test_dummy";
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "whsec_dummy";

const stripeClient = new Stripe(stripeKey, {
  apiVersion: "2025-10-29.clover", // Latest API version as of Stripe SDK v19
});

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    usePlural: true,
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            accessType: "offline",
            prompt: "select_account consent",
          },
        }
      : {}),
    ...(process.env.LINE_CLIENT_ID && process.env.LINE_CLIENT_SECRET
      ? {
          line: {
            clientId: process.env.LINE_CLIENT_ID,
            clientSecret: process.env.LINE_CLIENT_SECRET,
          },
        }
      : {}),
  },
  plugins: [
    nextCookies(),
    stripe({
      stripeClient,
      stripeWebhookSecret: stripeWebhookSecret,
      createCustomerOnSignUp: true,
      subscription: {
        enabled: true,
        plans: [
          {
            name: "lite",
            priceId: "price_1SS6kqFRLAQ89fziKHRjRz98", // ¥480/month
            limits: {
              aiGenerationsPerMonth: 100,
              textInputMaxChars: 10000,
              pdfMaxSizeMB: 25,
            },
          },
          {
            name: "pro",
            priceId: "price_1SRwepFRLAQ89fziyvwuSTDR", // ¥980/month
            limits: {
              aiGenerationsPerMonth: 500,
              textInputMaxChars: 25000,
              pdfMaxSizeMB: 50,
            },
          },
        ],
        onSubscriptionComplete: async ({ subscription, plan }) => {
          console.log(
            `Subscription ${subscription.id} created for plan ${plan.name}`
          );
        },
        onSubscriptionUpdate: async ({ subscription }) => {
          console.log(`Subscription ${subscription.id} updated`);
        },
        onSubscriptionCancel: async ({ subscription }) => {
          console.log(`Subscription ${subscription.id} canceled`);
        },
      },
    }),
    // Social auth plugins (google/github/line) removed due to mismatched
    // exports in the installed `better-auth/plugins` package. Re-add these
    // provider plugin calls when the correct plugin factory exports are
    // available in your dependency version.
    anonymous({
      emailDomainName: "anon.gakushukun.com",
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        await db
          .update(decks)
          .set({ userId: newUser.user.id })
          .where(eq(decks.userId, anonymousUser.user.id));
        await db
          .update(tags)
          .set({ userId: newUser.user.id })
          .where(eq(tags.userId, anonymousUser.user.id));
        await db
          .update(studySessions)
          .set({ userId: newUser.user.id })
          .where(eq(studySessions.userId, anonymousUser.user.id));
      },
    }),
  ],
});
