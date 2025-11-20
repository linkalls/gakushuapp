import { authClient } from "./auth-client";

export type SubscriptionPlan = "free" | "lite" | "pro";

export interface PlanLimits {
  aiGenerationsPerMonth: number;
  textInputMaxChars: number;
  pdfMaxSizeMB: number;
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: {
    aiGenerationsPerMonth: 10,
    textInputMaxChars: 5000,
    pdfMaxSizeMB: 10,
  },
  lite: {
    aiGenerationsPerMonth: 100,
    textInputMaxChars: 10000,
    pdfMaxSizeMB: 25,
  },
  pro: {
    aiGenerationsPerMonth: 500,
    textInputMaxChars: 25000,
    pdfMaxSizeMB: 50,
  },
};

export const PLAN_PRICES = {
  lite: {
    monthly: 480, // ¥480/month
    currency: "jpy",
  },
  pro: {
    monthly: 980, // ¥980/month
    currency: "jpy",
  },
};

/**
 * Get the current user's subscription plan
 * TEMPORARY: Always returns "free" to disable paid plans.
 */
export async function getCurrentPlan(): Promise<SubscriptionPlan> {
  return "free";
}

/**
 * Get the current user's subscription plan (Legacy)
 * Original logic preserved for future use.
 */
export async function _getCurrentPlan(): Promise<SubscriptionPlan> {
  try {
    const { data: subscriptions } = await authClient.subscription.list({});

    if (!subscriptions || subscriptions.length === 0) {
      return "free";
    }

    const activeSubscription = subscriptions.find(
      (sub) => sub.status === "active" || sub.status === "trialing"
    );

    if (!activeSubscription) {
      return "free";
    }

    return (activeSubscription.plan as SubscriptionPlan) || "free";
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return "free";
  }
}

/**
 * Get the limits for the current user's plan
 */
export async function getCurrentLimits(): Promise<PlanLimits> {
  const plan = await getCurrentPlan();
  return PLAN_LIMITS[plan];
}

/**
 * Check if the user has exceeded a specific limit
 */
export async function hasExceededLimit(
  limitType: keyof PlanLimits,
  currentUsage: number
): Promise<boolean> {
  const limits = await getCurrentLimits();
  return currentUsage >= limits[limitType];
}

/**
 * Upgrade to a specific plan
 */
export async function upgradeToPlan(
  plan: "lite" | "pro",
  options: {
    successUrl: string;
    cancelUrl: string;
  }
) {
  console.warn("Billing is currently under construction. Upgrade blocked.");
  return {
    data: null,
    error: { message: "現在、プランのアップグレードは準備中です。" }
  };
  /*
  // Original logic
  return authClient.subscription.upgrade({
    plan,
    successUrl: options.successUrl,
    cancelUrl: options.cancelUrl,
  });
  */
}

/**
 * Upgrade to Pro plan (legacy function for backward compatibility)
 */
export async function upgradeToPro(options: {
  successUrl: string;
  cancelUrl: string;
}) {
  return upgradeToPlan("pro", options);
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(options: {
  subscriptionId: string;
  returnUrl: string;
}) {
  console.warn("Billing is currently under construction. Cancel blocked.");
   return {
    data: null,
    error: { message: "現在、プランの変更は準備中です。" }
  };
  /*
  // Original logic
  return authClient.subscription.cancel({
    subscriptionId: options.subscriptionId,
    returnUrl: options.returnUrl,
  });
  */
}

/**
 * Restore a canceled subscription
 */
export async function restoreSubscription(subscriptionId: string) {
  console.warn("Billing is currently under construction. Restore blocked.");
  return {
    data: null,
    error: { message: "現在、プランの変更は準備中です。" }
  };
  /*
  // Original logic
  return authClient.subscription.restore({
    subscriptionId,
  });
  */
}

/**
 * Open billing portal
 */
export async function openBillingPortal(returnUrl: string) {
  console.warn("Billing is currently under construction. Portal blocked.");
  return {
    data: null,
    error: { message: "現在、課金ポータルは準備中です。" }
  };
  /*
  // Original logic
  return authClient.subscription.billingPortal({
    returnUrl,
  });
  */
}
