import { db, generateId } from "./drizzle";
import * as schema from "./drizzle-schema";
import { Argon2id } from "oslo/password";
import { eq } from "drizzle-orm";
import { getInitialCardState } from "../utils/fsrs";

const DEMO_USER_EMAIL = "demo@example.com";
const DEMO_USER_PASSWORD = "password123";

async function seed() {
  console.log("🌱 Seeding database...");

  // --- 1. Create Demo User ---
  const existingUser = await db.query.users.findFirst({
    where: eq(schema.users.email, DEMO_USER_EMAIL),
  });

  let userId: string;

  if (existingUser) {
    console.log("✅ Demo user already exists.");
    userId = existingUser.id;
  } else {
    const newUserId = generateId();
    await db.insert(schema.users).values({
      id: newUserId,
      email: DEMO_USER_EMAIL,
      name: "デモユーザー",
      emailVerified: true,
    });
    
    // Create a corresponding account for the credentials provider
    const hashedPassword = await new Argon2id().hash(DEMO_USER_PASSWORD);
    await db.insert(schema.accounts).values({
        id: generateId(),
        userId: newUserId,
        providerId: "credentials",
        accountId: DEMO_USER_EMAIL,
        password: hashedPassword,
    });

    userId = newUserId;
    console.log("👤 Created demo user and account.");
  }

  // --- 2. Create Sample Deck and Cards for Demo User ---
  const deckName = "英単語サンプル";
  const existingDeck = await db.query.decks.findFirst({
    where: eq(schema.decks.name, deckName) && eq(schema.decks.userId, userId),
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
        due: new Date().getTime(),
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
