import { stripeClient } from "@better-auth/stripe/client";
import { anonymousClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react";



export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
   plugins: [
        stripeClient({
            subscription: true //if you want to enable subscription management
        }),
        anonymousClient()
    ]
});

export const { useSession, signIn, signOut, signUp } = authClient;
