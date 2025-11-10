import { and, eq } from "drizzle-orm";
import { auth } from "../auth";
import { getInitialCardState } from "../utils/fsrs";
import { db, generateId } from "./drizzle";
import * as schema from "./drizzle-schema";

const DEMO_USER_EMAIL = "demo@example.com";
const DEMO_USER_PASSWORD = "password123";

import { createAuthClient } from "better-auth/client";

const authClient = createAuthClient({
  baseURL: `localhost:3000/api/auth`, // APIエンドポイント
  // plugins: [...] // オプションでプラグイン追加
});
async function demoSignUp() {
 return await authClient.signUp.email({
    email: DEMO_USER_EMAIL,
    name: "Demo User",
    password: DEMO_USER_PASSWORD,
  });
  // ここでユーザー作成される
}
async function seed() {
  console.log("🌱 Seeding database...");

  // --- 1. Create Demo User ---


  let userId: string;


   userId = (await demoSignUp()).data?.user?.id!;
    console.log("👤 Created demo user.");
  

  // Ensure there is a credential account linked to this user with a
  // Better Auth-compatible password hash. Use the library's password
  // helper so the format (scrypt salt:hexKey) matches verification.
  const ctx = await auth.$context;
  const hashedPassword = await ctx.password.hash(DEMO_USER_PASSWORD);

  const existingAccount = await db.query.accounts.findFirst({
    where: and(
      eq(schema.accounts.userId, userId),
      eq(schema.accounts.providerId, "credential")
    ),
  });

  if (existingAccount) {
    // Update the password to the correctly formatted hash if needed.
    await db
      .update(schema.accounts)
      .set({ password: hashedPassword })
      .where(eq(schema.accounts.id, existingAccount.id));
    console.log(
      "🔐 Ensured demo credential account exists and password is up-to-date."
    );
  } else {
    await db.insert(schema.accounts).values({
      id: generateId(),
      userId: userId,
      providerId: "credential",
      accountId: userId,
      password: hashedPassword,
    });
    console.log("👤 Created demo credential account.");
  }

  // --- 2. Create Sample Deck and Cards for Demo User ---
  const deckName = "英単語サンプル";
  const existingDeck = await db.query.decks.findFirst({
    where: and(
      eq(schema.decks.name, deckName),
      eq(schema.decks.userId, userId)
    ),
  });

  if (existingDeck) {
    console.log("✅ Sample deck already exists.");
  } else {
    const deckId = generateId();
    await db.insert(schema.decks).values({
      id: deckId,
      userId: userId,
      name: deckName,
      description: "基本的な英単語を学習するためのサンプルデッキです。",
      deckPath: deckName,
    });
    console.log("📚 Created sample deck.");

    const sampleCards = [
      { front: "apple", back: "りんご" },
      { front: "book", back: "本" },
      { front: "car", back: "車" },
      { front: "dog", back: "犬" },
      { front: "house", back: "家" },
    ];

    for (const card of sampleCards) {
      const initialState = getInitialCardState();
      await db.insert(schema.cards).values({
        id: generateId(),
        deckId: deckId,
        front: card.front,
        back: card.back,
        ...initialState,
        due: Date.now(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    console.log(`🃏 Seeded ${sampleCards.length} sample cards.`);
  }

  console.log("🌳 Seeding complete.");
}

seed().catch((error) => {
  console.error("❌ Seeding failed:", error);
  process.exit(1);
});
