import { db } from "@/lib/db/drizzle";
import { subscriptions } from "@/lib/db/drizzle-schema";
import { eq, and } from "drizzle-orm";

export type SubscriptionStatus = 
  | "active" 
  | "trialing" 
  | "canceled" 
  | "past_due" 
  | "unpaid" 
  | "incomplete" 
  | "incomplete_expired";

export interface UserSubscription {
  id: string;
  plan: string;
  status: string;
  periodStart: Date | null;
  periodEnd: Date | null;
  cancelAtPeriodEnd: boolean | null;
  trialStart: Date | null;
  trialEnd: Date | null;
}

/**
 * Get active subscription for a user (server-side)
 */
export async function getActiveSubscription(
  userId: string
): Promise<UserSubscription | null> {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.referenceId, userId))
    .limit(1);

  if (!subscription) {
    return null;
  }

  // Check if subscription is active or trialing
  if (subscription.status !== "active" && subscription.status !== "trialing") {
    return null;
  }

  return {
    id: subscription.id,
    plan: subscription.plan,
    status: subscription.status,
    periodStart: subscription.periodStart,
    periodEnd: subscription.periodEnd,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    trialStart: subscription.trialStart,
    trialEnd: subscription.trialEnd,
  };
}

/**
 * Check if user has an active pro subscription
 */
export async function hasProSubscription(userId: string): Promise<boolean> {
  const subscription = await getActiveSubscription(userId);
  return subscription?.plan === "pro";
}

/**
 * Get all subscriptions for a user
 */
export async function getUserSubscriptions(
  userId: string
): Promise<UserSubscription[]> {
  const userSubscriptions = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.referenceId, userId));

  return userSubscriptions.map((sub) => ({
    id: sub.id,
    plan: sub.plan,
    status: sub.status,
    periodStart: sub.periodStart,
    periodEnd: sub.periodEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    trialStart: sub.trialStart,
    trialEnd: sub.trialEnd,
  }));
}

/**
 * Check if user is on trial
 */
export async function isOnTrial(userId: string): Promise<boolean> {
  const subscription = await getActiveSubscription(userId);
  
  if (!subscription || subscription.status !== "trialing") {
    return false;
  }

  // Check if trial hasn't expired
  if (subscription.trialEnd) {
    return new Date() < subscription.trialEnd;
  }

  return false;
}
