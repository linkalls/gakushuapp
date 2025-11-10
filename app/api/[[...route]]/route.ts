import { auth } from "@/lib/auth";
import { db, generateId, now } from "@/lib/db/drizzle";
import * as schema from "@/lib/db/drizzle-schema";
import { generateApkg } from "@/lib/utils/apkg-export";
import { parseApkgFile, type ImportResult } from "@/lib/utils/apkg-import";
import { getInitialCardState, Rating, reviewCard } from "@/lib/utils/fsrs";
import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  like,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { handle } from "hono/vercel";
import path from "path";

const { users, decks, cards, reviews, tags, cardTags } = schema;
type User = typeof users.$inferSelect;
type Deck = typeof decks.$inferSelect;
type Card = typeof cards.$inferSelect;

// Create Hono app
// Note: basePath is removed because this file is already in /app/api/[[...route]]/
const app = new Hono().basePath("/api");

// Middleware
app.use("*", cors());
app.use("*", logger());

// Helper function to get user from session
async function getUserSession(headers: Headers) {
  const session = await auth.api.getSession({ headers });
  if (!session) {
    return null;
  }
  return { userId: session.user.id, session };
}

// Health check
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: now() });
});

// ============================================
// Auth API - Handled by Better Auth at /api/auth/*
// ============================================

// ============================================
// Decks API
// ============================================

// Get all decks for a user with stats
app.get("/decks", async (c) => {
  // Get userId from session
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const userId = session.user.id;

  const includeStats = c.req.query("includeStats") === "true";

  const allDecks = await db
    .select()
    .from(decks)
    .where(eq(decks.userId, userId))
    .orderBy(desc(decks.createdAt))
    .all();

  if (!includeStats) {
    return c.json(allDecks);
  }

  // Batch calculate stats for all decks
  const currentTime = now();
  const decksWithStats = await Promise.all(
    allDecks.map(async (deck) => {
      // Get all descendant decks (including self)
      const descendantDecks = await db
        .select()
        .from(decks)
        .where(
          or(
            eq(decks.deckPath, deck.deckPath),
            like(decks.deckPath, `${deck.deckPath}::%`)
          )
        )
        .all();

      const deckIds = descendantDecks.map((d) => d.id);

      if (deckIds.length === 0) {
        return {
          ...deck,
          stats: {
            totalCards: 0,
            newCards: 0,
            learningCards: 0,
            dueCards: 0,
            progress: 0,
          },
        };
      }

      const totalCardsResult = await db
        .select({ count: count() })
        .from(cards)
        .where(inArray(cards.deckId, deckIds))
        .get();
      const totalCards = totalCardsResult?.count || 0;

      const newCardsResult = await db
        .select({ count: count() })
        .from(cards)
        .where(and(inArray(cards.deckId, deckIds), eq(cards.state, 0)))
        .get();
      const newCards = newCardsResult?.count || 0;

      const learningCardsResult = await db
        .select({ count: count() })
        .from(cards)
        .where(
          and(inArray(cards.deckId, deckIds), inArray(cards.state, [1, 3]))
        )
        .get();
      const learningCards = learningCardsResult?.count || 0;

      const reviewCardsResult = await db
        .select({ count: count() })
        .from(cards)
        .where(and(inArray(cards.deckId, deckIds), eq(cards.state, 2)))
        .get();
      const reviewCards = reviewCardsResult?.count || 0;

      const dueCardsResult = await db
        .select({ count: count() })
        .from(cards)
        .where(
          and(
            inArray(cards.deckId, deckIds),
            sql`${cards.state} != 0`, // 新規カード(state=0)を除外
            lte(cards.due, currentTime)
          )
        )
        .get();
      const dueCards = dueCardsResult?.count || 0;

      const progress =
        totalCards > 0
          ? Math.round(((totalCards - newCards) / totalCards) * 100)
          : 0;

      return {
        ...deck,
        stats: {
          totalCards,
          newCards,
          learningCards,
          reviewCards,
          dueCards,
          progress,
        },
      };
    })
  );

  return c.json(decksWithStats);
});

// Get deck by ID
app.get("/decks/:id", async (c) => {
  const id = c.req.param("id");
  const userSession = await getUserSession(c.req.raw.headers);

  const deck = await db.select().from(decks).where(eq(decks.id, id)).get();

  if (!deck) {
    return c.json({ error: "Deck not found" }, 404);
  }

  // Public decks can be viewed by anyone
  if (deck.isPublic) {
    return c.json(deck);
  }

  // Private decks can only be viewed by the owner
  if (!userSession || userSession.userId !== deck.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return c.json(deck);
});

// Share or unshare a deck
app.put("/decks/:id/share", async (c) => {
  const id = c.req.param("id");
  const userSession = await getUserSession(c.req.raw.headers);

  if (!userSession) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json<{ is_public: boolean }>();

  const deck = await db.select().from(decks).where(eq(decks.id, id)).get();

  if (!deck) {
    return c.json({ error: "Deck not found" }, 404);
  }

  if (deck.userId !== userSession.userId) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const updateData: {
    isPublic: boolean;
    shareId?: string;
    updatedAt: Date;
  } = {
    isPublic: body.is_public,
    updatedAt: new Date(),
  };

  if (body.is_public && !deck.shareId) {
    updateData.shareId = generateId();
  }

  await db.update(decks).set(updateData).where(eq(decks.id, id));

  const updatedDeck = await db
    .select()
    .from(decks)
    .where(eq(decks.id, id))
    .get();

  return c.json(updatedDeck);
});

// Get shared deck by shareId
app.get("/decks/shared/:shareId", async (c) => {
  const shareId = c.req.param("shareId");

  if (!shareId) {
    return c.json({ error: "Share ID is required" }, 400);
  }

  const deck = await db
    .select()
    .from(decks)
    .where(eq(decks.shareId, shareId))
    .get();

  if (!deck || !deck.isPublic) {
    return c.json({ error: "Deck not found or not public" }, 404);
  }

  // Optionally, you can also fetch user info to show who the deck belongs to
  const owner = await db
    .select({
      id: users.id,
      name: users.name,
      image: users.image,
    })
    .from(users)
    .where(eq(users.id, deck.userId))
    .get();

  return c.json({ ...deck, owner });
});

// Get deck stats (including children)
app.get("/decks/:id/stats", async (c) => {
  const id = c.req.param("id");
  const deck = await db.select().from(decks).where(eq(decks.id, id)).get();

  if (!deck) {
    return c.json({ error: "Deck not found" }, 404);
  }

  // Get all descendant decks (including self)
  const descendantDecks = await db
    .select()
    .from(decks)
    .where(
      or(
        eq(decks.deckPath, deck.deckPath),
        like(decks.deckPath, `${deck.deckPath}::%`)
      )
    )
    .all();

  const deckIds = descendantDecks.map((d) => d.id);

  if (deckIds.length === 0) {
    return c.json({
      totalCards: 0,
      newCards: 0,
      learningCards: 0,
      reviewCards: 0,
      dueCards: 0,
      progress: 0,
    });
  }

  // Get card statistics
  const currentTime = now();

  const totalCardsResult = await db
    .select({ count: count() })
    .from(cards)
    .where(inArray(cards.deckId, deckIds))
    .get();
  const totalCards = totalCardsResult?.count || 0;

  const newCardsResult = await db
    .select({ count: count() })
    .from(cards)
    .where(and(inArray(cards.deckId, deckIds), eq(cards.state, 0)))
    .get();
  const newCards = newCardsResult?.count || 0;

  const learningCardsResult = await db
    .select({ count: count() })
    .from(cards)
    .where(and(inArray(cards.deckId, deckIds), inArray(cards.state, [1, 3])))
    .get();
  const learningCards = learningCardsResult?.count || 0;

  const reviewCardsResult = await db
    .select({ count: count() })
    .from(cards)
    .where(and(inArray(cards.deckId, deckIds), eq(cards.state, 2)))
    .get();
  const reviewCards = reviewCardsResult?.count || 0;

  const dueCardsResult = await db
    .select({ count: count() })
    .from(cards)
    .where(
      and(
        inArray(cards.deckId, deckIds),
        sql`${cards.state} != 0`,
        lte(cards.due, currentTime)
      )
    )
    .get();
  const dueCards = dueCardsResult?.count || 0;

  const progress =
    totalCards > 0
      ? Math.round(((totalCards - newCards) / totalCards) * 100)
      : 0;

  console.log(
    `[Stats] Deck ${id} - Total: ${totalCards}, New: ${newCards}, Learning: ${learningCards}, Review: ${reviewCards}, Due: ${dueCards}`
  );

  return c.json({
    totalCards,
    newCards,
    learningCards,
    reviewCards,
    dueCards,
    progress,
  });
});

// Create deck
app.post("/decks", async (c) => {
  const userSession = await getUserSession(c.req.raw.headers);
  if (!userSession) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const userId = userSession.userId;

  const body = await c.req.json<{
    name: string;
    description?: string;
    parentId?: string;
  }>();

  const id = generateId();
  const timestamp = new Date();

  // Calculate deckPath
  let deckPath = body.name;
  if (body.parentId) {
    const parent = await db
      .select()
      .from(decks)
      .where(eq(decks.id, body.parentId))
      .get();

    if (parent) {
      deckPath = `${parent.deckPath}::${body.name}`;
    }
  }

  await db.insert(decks).values({
    id,
    userId: userId,
    name: body.name,
    description: body.description || null,
    parentId: body.parentId || null,
    deckPath: deckPath,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const deck = await db.select().from(decks).where(eq(decks.id, id)).get();

  return c.json(deck, 201);
});

// Update deck
app.put("/decks/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{ name?: string; description?: string }>();

  const deck = await db.select().from(decks).where(eq(decks.id, id)).get();

  if (!deck) {
    return c.json({ error: "Deck not found" }, 404);
  }

  const timestamp = new Date();
  await db
    .update(decks)
    .set({
      name: body.name || deck.name,
      description:
        body.description !== undefined ? body.description : deck.description,
      updatedAt: timestamp,
    })
    .where(eq(decks.id, id));

  const updatedDeck = await db
    .select()
    .from(decks)
    .where(eq(decks.id, id))
    .get();

  return c.json(updatedDeck);
});

// Delete deck
app.delete("/decks/:id", async (c) => {
  const id = c.req.param("id");

  // Drizzle will handle cascade delete via foreign key constraints
  await db.delete(decks).where(eq(decks.id, id));

  return c.json({ success: true });
});

// Export deck as .apkg
app.get("/decks/:id/export", async (c) => {
  const id = c.req.param("id");
  const userSession = await getUserSession(c.req.raw.headers);

  if (!userSession) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const deck = await db.select().from(decks).where(eq(decks.id, id)).get();

  if (!deck) {
    return c.json({ error: "Deck not found" }, 404);
  }

  if (deck.userId !== userSession.userId) {
    return c.json({ error: "Forbidden" }, 403);
  }

  // Get all descendant decks (including self)
  const descendantDecks = await db
    .select()
    .from(decks)
    .where(
      or(
        eq(decks.deckPath, deck.deckPath),
        like(decks.deckPath, `${deck.deckPath}::%`)
      )
    )
    .all();

  const childDecks = descendantDecks.filter((d) => d.id !== deck.id);
  const deckIds = descendantDecks.map((d) => d.id);

  // Get all cards in these decks
  const allCards = await db
    .select()
    .from(cards)
    .where(inArray(cards.deckId, deckIds))
    .all();

  try {
    const apkgBuffer = await generateApkg(deck, childDecks, allCards);
    const filename = `${deck.name.replace(/[^a-z0-9]/gi, "_")}.apkg`;

    return c.newResponse(new Uint8Array(apkgBuffer), 200, {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
    });
  } catch (error) {
    console.error("Failed to generate .apkg file:", error);
    return c.json({ error: "Failed to generate package." }, 500);
  }
});

// ============================================
// Cards API
// ============================================

// Get cards in a deck (with pagination and include children option)
app.get("/decks/:deckId/cards", async (c) => {
  const deckId = c.req.param("deckId");
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "20");
  const includeChildren = c.req.query("includeChildren") === "true";
  const offset = (page - 1) * limit;

  // Get deck
  const deck = await db.select().from(decks).where(eq(decks.id, deckId)).get();

  if (!deck) {
    return c.json({ error: "Deck not found" }, 404);
  }

  let deckIds = [deckId];

  if (includeChildren) {
    // Get all descendant decks
    const descendantDecks = await db
      .select()
      .from(decks)
      .where(
        or(
          eq(decks.deckPath, deck.deckPath),
          like(decks.deckPath, `${deck.deckPath}::%`)
        )
      )
      .all();

    deckIds = descendantDecks.map((d) => d.id);
  }

  // Get total count
  const totalCountResult = await db
    .select({ count: count() })
    .from(cards)
    .where(inArray(cards.deckId, deckIds))
    .get();
  const totalCount = totalCountResult?.count || 0;

  // Get paginated cards
  const cardsList = await db
    .select()
    .from(cards)
    .where(inArray(cards.deckId, deckIds))
    .orderBy(desc(cards.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  // Log state distribution for debugging
  const stateDistribution = cardsList.reduce((acc, card) => {
    acc[card.state] = (acc[card.state] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  console.log(`Deck ${deckId} cards - State distribution:`, stateDistribution);

  return c.json({
    cards: cardsList,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  });
});

// Get card by ID
app.get("/cards/:id", async (c) => {
  const id = c.req.param("id");

  const card = await db.select().from(cards).where(eq(cards.id, id)).get();

  if (!card) {
    return c.json({ error: "Card not found" }, 404);
  }

  return c.json(card);
});

// Create card
app.post("/cards", async (c) => {
  const body = await c.req.json<{
    deckId: string;
    front: string;
    back: string;
  }>();

  const id = generateId();
  const timestamp = new Date();
  const initialState = getInitialCardState();

  await db.insert(cards).values({
    id,
    deckId: body.deckId,
    front: body.front,
    back: body.back,
    due: initialState.due ?? timestamp.getTime(),
    stability: initialState.stability ?? 0,
    difficulty: initialState.difficulty ?? 0,
    elapsedDays: initialState.elapsedDays ?? 0,
    scheduledDays: initialState.scheduledDays ?? 0,
    reps: initialState.reps ?? 0,
    lapses: initialState.lapses ?? 0,
    state: initialState.state ?? 0,
    lastReview: initialState.lastReview ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const card = await db.select().from(cards).where(eq(cards.id, id)).get();

  return c.json(card, 201);
});

// Update card
app.put("/cards/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{ front?: string; back?: string }>();

  const card = await db.select().from(cards).where(eq(cards.id, id)).get();

  if (!card) {
    return c.json({ error: "Card not found" }, 404);
  }

  const timestamp = new Date();
  await db
    .update(cards)
    .set({
      front: body.front || card.front,
      back: body.back || card.back,
      updatedAt: timestamp,
    })
    .where(eq(cards.id, id));

  const updatedCard = await db
    .select()
    .from(cards)
    .where(eq(cards.id, id))
    .get();

  return c.json(updatedCard);
});

// Delete card
app.delete("/cards/:id", async (c) => {
  const id = c.req.param("id");

  await db.delete(cards).where(eq(cards.id, id));

  return c.json({ success: true });
});

// Get due cards
app.get("/cards/due", async (c) => {
  const userSession = await getUserSession(c.req.raw.headers);
  if (!userSession) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const userId = userSession.userId;

  const currentTime = now();

  // Get cards that are due (including new cards with state=0)
  // New cards (state=0) should also be available for study
  const cardsList = await db
    .select({
      id: cards.id,
      deckId: cards.deckId,
      front: cards.front,
      back: cards.back,
      due: cards.due,
      stability: cards.stability,
      difficulty: cards.difficulty,
      elapsedDays: cards.elapsedDays,
      scheduledDays: cards.scheduledDays,
      reps: cards.reps,
      lapses: cards.lapses,
      state: cards.state,
      lastReview: cards.lastReview,
      createdAt: cards.createdAt,
      updatedAt: cards.updatedAt,
    })
    .from(cards)
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .where(
      and(
        eq(decks.userId, userId),
        lte(cards.due, currentTime) // Include all cards where due <= now (including new cards)
      )
    )
    .orderBy(cards.due)
    .all();

  console.log(`Found ${cardsList.length} due cards (including new cards)`);

  return c.json(cardsList);
});

// ============================================
// Reviews API
// ============================================

// Submit a review
app.post("/reviews", async (c) => {
  const body = await c.req.json<{
    cardId: string;
    rating: number;
    // Client-calculated FSRS data
    cardData?: {
      due: number;
      stability: number;
      difficulty: number;
      elapsedDays: number;
      scheduledDays: number;
      reps: number;
      lapses: number;
      state: number;
      lastReview: number;
    };
  }>();

  const dbCard = await db
    .select()
    .from(cards)
    .where(eq(cards.id, body.cardId))
    .get();

  if (!dbCard) {
    return c.json({ error: "Card not found" }, 404);
  }

  const timestamp = new Date();
  let updatedCardData;

  // If client provided pre-calculated data, use it directly
  if (body.cardData) {
    console.log("Using client-calculated FSRS data:", body.cardData);
    updatedCardData = body.cardData;
  } else {
    // Fallback: Calculate on server (for backwards compatibility or if client fails)
    console.log("Client data not provided, calculating on server");

    const cardForFSRS = {
      id: dbCard.id,
      deckId: dbCard.deckId,
      front: dbCard.front,
      back: dbCard.back,
      due:
        typeof dbCard.due === "number"
          ? dbCard.due
          : (dbCard.due as Date).getTime(),
      stability: dbCard.stability,
      difficulty: dbCard.difficulty,
      elapsedDays: dbCard.elapsedDays,
      scheduledDays: dbCard.scheduledDays,
      reps: dbCard.reps,
      lapses: dbCard.lapses,
      state: dbCard.state,
      lastReview: dbCard.lastReview,
      createdAt:
        dbCard.createdAt instanceof Date
          ? dbCard.createdAt.getTime()
          : dbCard.createdAt,
      updatedAt:
        dbCard.updatedAt instanceof Date
          ? dbCard.updatedAt.getTime()
          : dbCard.updatedAt,
    };

    const { card: serverCalculated } = reviewCard(
      cardForFSRS,
      body.rating as Rating
    );

    updatedCardData = {
      due: serverCalculated.due!,
      stability: serverCalculated.stability!,
      difficulty: serverCalculated.difficulty!,
      elapsedDays: serverCalculated.elapsedDays!,
      scheduledDays: serverCalculated.scheduledDays!,
      reps: serverCalculated.reps!,
      lapses: serverCalculated.lapses!,
      state: serverCalculated.state!,
      lastReview: serverCalculated.lastReview!,
    };
  }

  // Validate data
  if (
    updatedCardData.due === undefined ||
    updatedCardData.due === null ||
    Number.isNaN(updatedCardData.due)
  ) {
    console.error("Invalid card data received:", updatedCardData);
    return c.json({ error: "Invalid card data" }, 400);
  }

  // Update card in database
  console.log("Updating card in database:", {
    cardId: body.cardId,
    due: updatedCardData.due,
    state: updatedCardData.state,
    stability: updatedCardData.stability,
    difficulty: updatedCardData.difficulty,
    reps: updatedCardData.reps,
    lapses: updatedCardData.lapses,
  });

  await db
    .update(cards)
    .set({
      due: updatedCardData.due,
      stability: updatedCardData.stability,
      difficulty: updatedCardData.difficulty,
      elapsedDays: updatedCardData.elapsedDays,
      scheduledDays: updatedCardData.scheduledDays,
      reps: updatedCardData.reps,
      lapses: updatedCardData.lapses,
      state: updatedCardData.state,
      lastReview: updatedCardData.lastReview,
      updatedAt: timestamp,
    })
    .where(eq(cards.id, body.cardId));

  // Save review record
  const reviewId = generateId();
  await db.insert(reviews).values({
    id: reviewId,
    cardId: body.cardId,
    rating: body.rating,
    reviewTime: timestamp.getTime(),
    createdAt: timestamp,
  });

  const updatedCard = await db
    .select()
    .from(cards)
    .where(eq(cards.id, body.cardId))
    .get();

  console.log("Card saved to database:", {
    cardId: updatedCard?.id,
    state: updatedCard?.state,
    due: updatedCard?.due,
    reps: updatedCard?.reps,
  });

  return c.json({ card: updatedCard });
});

// Get statistics
app.get("/stats", async (c) => {
  const userSession = await getUserSession(c.req.raw.headers);
  if (!userSession) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const userId = userSession.userId;

  // Get all cards for the user
  const cardsList = await db
    .select({
      id: cards.id,
      deckId: cards.deckId,
      front: cards.front,
      back: cards.back,
      due: cards.due,
      stability: cards.stability,
      difficulty: cards.difficulty,
      elapsedDays: cards.elapsedDays,
      scheduledDays: cards.scheduledDays,
      reps: cards.reps,
      lapses: cards.lapses,
      state: cards.state,
      lastReview: cards.lastReview,
      createdAt: cards.createdAt,
      updatedAt: cards.updatedAt,
    })
    .from(cards)
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .where(eq(decks.userId, userId))
    .all();

  const totalDecksResult = await db
    .select({ count: count() })
    .from(decks)
    .where(eq(decks.userId, userId))
    .get();
  const totalDecks = totalDecksResult?.count || 0;

  const dueCardsResult = await db
    .select({ count: count() })
    .from(cards)
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .where(
      and(
        eq(decks.userId, userId),
        sql`${cards.state} != 0`,
        lte(cards.due, now())
      )
    )
    .get();
  const dueCards = dueCardsResult?.count || 0;

  const reviewsTodayResult = await db
    .select({ count: count() })
    .from(reviews)
    .innerJoin(cards, eq(reviews.cardId, cards.id))
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .where(
      and(
        eq(decks.userId, userId),
        gte(reviews.reviewTime, Date.now() - 24 * 60 * 60 * 1000)
      )
    )
    .get();
  const reviewsToday = reviewsTodayResult?.count || 0;

  const stats = {
    totalDecks,
    totalCards: cardsList.length,
    dueCards,
    reviewsToday,
    cards: cardsList, // Include cards for stats page
  };

  return c.json(stats);
});

// Get detailed statistics for charts
app.get("/stats/detailed", async (c) => {
  const userSession = await getUserSession(c.req.raw.headers);
  if (!userSession) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const userId = userSession.userId;

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  // Get all reviews for the past 30 days
  const reviewsList = await db
    .select({
      id: reviews.id,
      cardId: reviews.cardId,
      rating: reviews.rating,
      reviewTime: reviews.reviewTime,
      state: reviews.state,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .innerJoin(cards, eq(reviews.cardId, cards.id))
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .where(
      and(eq(decks.userId, userId), gte(reviews.reviewTime, thirtyDaysAgo))
    )
    .orderBy(desc(reviews.reviewTime))
    .all();

  // Get daily review counts for the past 30 days
  const dailyReviews = await db
    .select({
      date: sql<string>`date(${reviews.reviewTime} / 1000, 'unixepoch')`,
      count: count(),
    })
    .from(reviews)
    .innerJoin(cards, eq(reviews.cardId, cards.id))
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .where(
      and(eq(decks.userId, userId), gte(reviews.reviewTime, thirtyDaysAgo))
    )
    .groupBy(sql`date(${reviews.reviewTime} / 1000, 'unixepoch')`)
    .orderBy(sql`date(${reviews.reviewTime} / 1000, 'unixepoch')`)
    .all();

  // Get card state distribution
  const cardStates = await db
    .select({
      state: cards.state,
      count: count(),
    })
    .from(cards)
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .where(eq(decks.userId, userId))
    .groupBy(cards.state)
    .all();

  // Get average retention (cards reviewed with rating >= 2)
  const retentionData = await db
    .select({
      total: count(),
      passed: sql<number>`SUM(CASE WHEN ${reviews.rating} >= 2 THEN 1 ELSE 0 END)`,
    })
    .from(reviews)
    .innerJoin(cards, eq(reviews.cardId, cards.id))
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .where(
      and(eq(decks.userId, userId), gte(reviews.reviewTime, thirtyDaysAgo))
    )
    .get();

  const retention = retentionData?.total
    ? ((retentionData.passed / retentionData.total) * 100).toFixed(1)
    : "0";

  return c.json({
    reviews: reviewsList, // Include all reviews for detailed stats
    dailyReviews,
    cardStates,
    retention,
  });
});

// Import APKG
app.post("/import/apkg", async (c) => {
  // Get userId from session
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const userId = session.user.id;

  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Read file as ArrayBuffer
    const fileBuffer = await file.arrayBuffer();

    // Parse the .apkg file
    const {
      notes,
      cards: ankiCards,
      decks: ankiDecks,
      collectionCreated,
      media,
    } = await parseApkgFile(fileBuffer);

    const errors: string[] = [];
    let decksImported = 0;
    let cardsImported = 0;
    let mediaImported = 0;

    // Save media files to public/media directory
    if (media.size > 0) {
      const { mkdirSync, writeFileSync } = await import("fs");
      const mediaDir = path.join(process.cwd(), "public", "media");

      try {
        mkdirSync(mediaDir, { recursive: true });
      } catch (e) {
        // Directory might already exist
      }

      for (const [filename, data] of media.entries()) {
        try {
          const filepath = path.join(mediaDir, filename);
          writeFileSync(filepath, data);
          mediaImported++;
        } catch (err) {
          errors.push(`Failed to save media file "${filename}": ${err}`);
        }
      }
    }

    // Import decks - handle hierarchical deck names
    const deckIdMap = new Map<number, string>(); // Map Anki deck ID to our deck ID
    const deckPathMap = new Map<string, string>(); // Map deck_path to our deck ID

    // Sort decks by hierarchy depth (parents before children)
    const sortedDecks = Array.from(ankiDecks.entries()).sort((a, b) => {
      const depthA = a[1].name.split("::").length;
      const depthB = b[1].name.split("::").length;
      return depthA - depthB;
    });

    for (const [ankiDeckId, ankiDeck] of sortedDecks) {
      // Skip default deck
      if (ankiDeckId === 1 || ankiDeck.name === "Default") {
        continue;
      }

      try {
        const deckPath = ankiDeck.name; // Full path like "日本史一問一答::02中世::09江戸時代"
        const parts = deckPath.split("::");
        const deckName = parts[parts.length - 1]; // Just the last part

        let parentId: string | null = null;

        // If this is a child deck, find or create parent
        if (parts.length > 1) {
          const parentPath = parts.slice(0, -1).join("::");
          parentId = deckPathMap.get(parentPath) || null;

          // If parent doesn't exist, create it first
          if (!parentId) {
            const parentName = parts[parts.length - 2];
            const newParentId = generateId();
            const timestamp = new Date();

            // Determine grandparent path
            let grandparentPath = "";
            if (parts.length > 2) {
              grandparentPath = parts.slice(0, -2).join("::");
            }
            const grandparentId = grandparentPath
              ? deckPathMap.get(grandparentPath) || null
              : null;

            await db.insert(decks).values({
              id: newParentId,
              userId: userId,
              name: parentName,
              description: null,
              parentId: grandparentId,
              deckPath: parentPath,
              createdAt: timestamp,
              updatedAt: timestamp,
            });

            deckPathMap.set(parentPath, newParentId);
            parentId = newParentId;
            decksImported++;
          }
        }

        const newDeckId = generateId();
        const timestamp = new Date();

        await db.insert(decks).values({
          id: newDeckId,
          userId: userId,
          name: deckName,
          description: ankiDeck.desc || null,
          parentId: parentId,
          deckPath: deckPath,
          createdAt: timestamp,
          updatedAt: timestamp,
        });

        deckIdMap.set(ankiDeckId, newDeckId);
        deckPathMap.set(deckPath, newDeckId);
        decksImported++;
      } catch (err) {
        errors.push(`Failed to import deck "${ankiDeck.name}": ${err}`);
      }
    }

    // Create a map of notes for quick lookup
    const notesMap = new Map(notes.map((note) => [note.id, note]));

    // Import cards
    for (const ankiCard of ankiCards) {
      const note = notesMap.get(ankiCard.nid);
      if (!note) {
        errors.push(`Card ${ankiCard.id} has no associated note`);
        continue;
      }

      const deckId = deckIdMap.get(ankiCard.did);
      if (!deckId) {
        // Skip cards from default deck or decks we couldn't import
        continue;
      }

      try {
        // Parse note fields (separated by \x1f)
        const fields = note.flds.split("\x1f");
        const front = fields[0] || "";
        const back = fields[1] || "";

        if (!front || !back) {
          errors.push(`Card ${ankiCard.id} has empty fields`);
          continue;
        }

        const newCardId = generateId();
        const timestamp = new Date();

        // Convert Anki state to our FSRS state
        const initialState = getInitialCardState();

        // Anki due calculation:
        // - type 0 (new): due is the order in queue (not a date) → set to now for immediate study
        // - type 1 (learning): due is timestamp in seconds
        // - type 2 (review): due is days since collection creation (col.crt)
        // - type 3 (relearning): due is timestamp in seconds
        let dueTime = timestamp.getTime(); // Default: available now (for new cards)

        if (ankiCard.type === 2 && ankiCard.due !== undefined) {
          // Review cards: due is days since collection creation
          // Convert: (collection created seconds + due days * seconds per day) * 1000 for ms
          dueTime = (collectionCreated + ankiCard.due * 86400) * 1000;

          // If the due date is in the past, set to now for immediate review
          if (dueTime < timestamp.getTime()) {
            dueTime = timestamp.getTime();
          }
        } else if (
          (ankiCard.type === 1 || ankiCard.type === 3) &&
          ankiCard.due !== undefined
        ) {
          // Learning/relearning cards: due is already a timestamp in seconds
          dueTime = ankiCard.due * 1000;

          // If the due date is in the past, set to now
          if (dueTime < timestamp.getTime()) {
            dueTime = timestamp.getTime();
          }
        }
        // else: new cards (type 0) → use default dueTime = timestamp (now)

        // Use Anki's card state directly
        const cardState = ankiCard.type;

        await db.insert(cards).values({
          id: newCardId,
          deckId: deckId,
          front,
          back,
          due: dueTime,
          stability: initialState.stability ?? 0,
          difficulty: initialState.difficulty ?? 0,
          elapsedDays: 0,
          scheduledDays: ankiCard.ivl || 0,
          reps: ankiCard.reps || 0,
          lapses: ankiCard.lapses || 0,
          state: cardState, // 0=new, 1=learning, 2=review, 3=relearning
          lastReview: null,
          createdAt: timestamp,
          updatedAt: timestamp,
        });

        cardsImported++;
      } catch (err) {
        errors.push(`Failed to import card ${ankiCard.id}: ${err}`);
      }
    }

    const result: ImportResult = {
      decksImported,
      cardsImported,
      mediaImported,
      errors,
    };

    return c.json(result);
  } catch (err) {
    console.error("Import error:", err);
    return c.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to import .apkg file",
      },
      500
    );
  }
});

// ============================================
// Tags API
// ============================================

// Get all tags for a user
app.get("/tags", async (c) => {
  const userSession = await getUserSession(c.req.raw.headers);
  if (!userSession) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const userId = userSession.userId;

  const tagsList = await db
    .select()
    .from(tags)
    .where(eq(tags.userId, userId))
    .orderBy(tags.name)
    .all();

  return c.json(tagsList);
});

// Get tag by ID
app.get("/tags/:id", async (c) => {
  const id = c.req.param("id");
  const tag = await db.select().from(tags).where(eq(tags.id, id)).get();

  if (!tag) {
    return c.json({ error: "Tag not found" }, 404);
  }

  return c.json(tag);
});

// Create tag
app.post("/tags", async (c) => {
  const userSession = await getUserSession(c.req.raw.headers);
  if (!userSession) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const userId = userSession.userId;

  const body = await c.req.json<{ name: string }>();

  // Check if tag already exists
  const existing = await db
    .select()
    .from(tags)
    .where(and(eq(tags.userId, userId), eq(tags.name, body.name)))
    .get();

  if (existing) {
    return c.json({ error: "Tag already exists" }, 400);
  }

  const id = generateId();

  await db.insert(tags).values({
    id,
    userId: userId,
    name: body.name,
  });

  const tag = await db.select().from(tags).where(eq(tags.id, id)).get();

  return c.json(tag, 201);
});

// Update tag
app.put("/tags/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{ name: string }>();

  const tag = await db.select().from(tags).where(eq(tags.id, id)).get();

  if (!tag) {
    return c.json({ error: "Tag not found" }, 404);
  }

  await db.update(tags).set({ name: body.name }).where(eq(tags.id, id));

  const updated = await db.select().from(tags).where(eq(tags.id, id)).get();

  return c.json(updated);
});

// Delete tag
app.delete("/tags/:id", async (c) => {
  const id = c.req.param("id");

  await db.delete(tags).where(eq(tags.id, id));

  return c.json({ success: true });
});

// Add tag to card
app.post("/cards/:cardId/tags", async (c) => {
  const cardId = c.req.param("cardId");
  const body = await c.req.json<{ tagId: string }>();

  // Check if card exists
  const card = await db.select().from(cards).where(eq(cards.id, cardId)).get();

  if (!card) {
    return c.json({ error: "Card not found" }, 404);
  }

  // Check if tag exists
  const tag = await db.select().from(tags).where(eq(tags.id, body.tagId)).get();

  if (!tag) {
    return c.json({ error: "Tag not found" }, 404);
  }

  // Check if already tagged
  const existing = await db
    .select()
    .from(cardTags)
    .where(and(eq(cardTags.cardId, cardId), eq(cardTags.tagId, body.tagId)))
    .get();

  if (existing) {
    return c.json({ error: "Card already has this tag" }, 400);
  }

  await db.insert(cardTags).values({
    cardId: cardId,
    tagId: body.tagId,
  });

  return c.json({ success: true }, 201);
});

// Remove tag from card
app.delete("/cards/:cardId/tags/:tagId", async (c) => {
  const cardId = c.req.param("cardId");
  const tagId = c.req.param("tagId");

  await db
    .delete(cardTags)
    .where(and(eq(cardTags.cardId, cardId), eq(cardTags.tagId, tagId)));

  return c.json({ success: true });
});

// Get tags for a card
app.get("/cards/:cardId/tags", async (c) => {
  const cardId = c.req.param("cardId");

  const tagsList = await db
    .select({
      id: tags.id,
      name: tags.name,
      userId: tags.userId,
    })
    .from(tags)
    .innerJoin(cardTags, eq(cardTags.tagId, tags.id))
    .where(eq(cardTags.cardId, cardId))
    .orderBy(tags.name)
    .all();

  return c.json(tagsList);
});

// Get cards by tag
app.get("/tags/:tagId/cards", async (c) => {
  const tagId = c.req.param("tagId");

  const cardsList = await db
    .select({
      id: cards.id,
      deckId: cards.deckId,
      front: cards.front,
      back: cards.back,
      due: cards.due,
      stability: cards.stability,
      difficulty: cards.difficulty,
      elapsedDays: cards.elapsedDays,
      scheduledDays: cards.scheduledDays,
      reps: cards.reps,
      lapses: cards.lapses,
      state: cards.state,
      lastReview: cards.lastReview,
      createdAt: cards.createdAt,
      updatedAt: cards.updatedAt,
    })
    .from(cards)
    .innerJoin(cardTags, eq(cardTags.cardId, cards.id))
    .where(eq(cardTags.tagId, tagId))
    .orderBy(desc(cards.createdAt))
    .all();

  return c.json(cardsList);
});

// ============================================
// Search API
// ============================================

// Search cards
app.get("/search", async (c) => {
  const userSession = await getUserSession(c.req.raw.headers);
  if (!userSession) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const userId = userSession.userId;

  const query = c.req.query("q") || "";
  const deckIdFilter = c.req.query("deckId");
  const stateFilter = c.req.query("state");

  if (!query.trim()) {
    return c.json({ cards: [], total: 0 });
  }

  // Build search conditions
  const searchPattern = `%${query}%`;
  let conditions: any[] = [eq(decks.userId, userId)];

  // Text search in front or back
  conditions.push(
    or(like(cards.front, searchPattern), like(cards.back, searchPattern))
  );

  // Filter by deck
  if (deckIdFilter) {
    conditions.push(eq(cards.deckId, deckIdFilter));
  }

  // Filter by state
  if (stateFilter !== undefined) {
    conditions.push(eq(cards.state, parseInt(stateFilter)));
  }

  const searchResults = await db
    .select({
      id: cards.id,
      deckId: cards.deckId,
      deck_name: decks.name,
      front: cards.front,
      back: cards.back,
      due: cards.due,
      stability: cards.stability,
      difficulty: cards.difficulty,
      elapsedDays: cards.elapsedDays,
      scheduledDays: cards.scheduledDays,
      reps: cards.reps,
      lapses: cards.lapses,
      state: cards.state,
      lastReview: cards.lastReview,
      createdAt: cards.createdAt,
      updatedAt: cards.updatedAt,
    })
    .from(cards)
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .where(and(...conditions))
    .orderBy(desc(cards.updatedAt))
    .limit(100)
    .all();

  return c.json({
    cards: searchResults,
    total: searchResults.length,
    query,
  });
});

// ============================================
// Study Sessions API
// ============================================

app.get("/study-sessions", async (c) => {
  const userSession = await getUserSession(c.req.raw.headers);
  if (!userSession) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const userId = userSession.userId;

  const data = await db
    .select()
    .from(schema.studySessions)
    .where(eq(schema.studySessions.userId, userId))
    .orderBy(desc(schema.studySessions.createdAt))
    .all();

  return c.json(data);
});
app.post("/study-sessions", async (c) => {
  const userSession = await getUserSession(c.req.raw.headers);
  if (!userSession) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const userId = userSession.userId;

  const body = await c.req.json();
  const { deckId, duration, cardsReviewed } = body;

  if (!deckId || !duration || !cardsReviewed) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  const id = generateId();
  const timestamp = new Date();

  await db.insert(schema.studySessions).values({
    id,
    userId: userId,
    deckId,
    duration: Number(duration),
    cardsReviewed: Number(cardsReviewed),
    createdAt: timestamp,
  });

  return c.json({ message: "OK" }, 200);
});

// ============================================
// Ranking API
// ============================================

// Get weekly review ranking
app.get("/ranking/weekly-reviews", async (c) => {
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const ranking = await db
    .select({
      userId: users.id,
      userName: users.name,
      userImage: users.image,
      reviewCount: count(reviews.id),
    })
    .from(reviews)
    .innerJoin(cards, eq(reviews.cardId, cards.id))
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .innerJoin(users, eq(decks.userId, users.id))
    .where(gte(reviews.reviewTime, oneWeekAgo))
    .groupBy(users.id, users.name, users.image)
    .orderBy(desc(count(reviews.id)))
    .limit(20)
    .all();

  return c.json(ranking);
});

// ============================================
// Profile API
// ============================================
app.put("/profile", async (c) => {
  const userSession = await getUserSession(c.req.raw.headers);
  if (!userSession) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const userId = userSession.userId;

  const body = await c.req.json<{ name?: string }>();

  if (!body.name || body.name.trim().length === 0) {
    return c.json({ error: "Name cannot be empty" }, 400);
  }

  const timestamp = new Date();
  await db
    .update(users)
    .set({
      name: body.name,
      updatedAt: timestamp,
    })
    .where(eq(users.id, userId));

  const updatedUser = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .get();

  return c.json(updatedUser);
});

// ============================================
// AI Generation API
// ============================================
import { aiGenerations } from "@/lib/db/schemas/extended-schema";
import {
  checkAIUsageLimit,
  generateCardsFromImage,
  generateCardsFromPDF,
  generateCardsFromText,
} from "@/lib/utils/ai-generation";

// Generate cards from text
app.post("/ai/generate/text", async (c) => {
  const userSession = await getUserSession(c.req.raw.headers);
  if (!userSession) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const userId = userSession.userId;

  // Get user info for usage check
  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  // Check AI usage limit
  const usageCheck = checkAIUsageLimit(
    user.plan,
    user.aiUsageCount,
    user.aiUsageResetAt
  );

  if (!usageCheck.allowed) {
    return c.json(
      { error: "AI usage limit reached. Upgrade to Pro for unlimited access." },
      429
    );
  }

  const body = await c.req.json();
  const { text, deckId, count = 10 } = body;

  if (!text || !deckId) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  const generationId = generateId();

  try {
    // Create generation record
    await db.insert(aiGenerations).values({
      id: generationId,
      userId,
      deckId,
      type: "text",
      inputContent: text.substring(0, 1000), // 最初の1000文字のみ保存
      cardsGenerated: 0,
      status: "pending",
      createdAt: new Date(),
    });

    // Generate cards
    const generatedCards = await generateCardsFromText(text, count);

    // Insert cards into database
    const initialState = getInitialCardState();
    const timestamp = Date.now();

    for (const card of generatedCards) {
      const cardId = generateId();
      await db.insert(cards).values({
        id: cardId,
        deckId,
        front: card.front,
        back: card.back,
        due: initialState.due || timestamp,
        stability: initialState.stability || 0,
        difficulty: initialState.difficulty || 0,
        elapsedDays: initialState.elapsedDays || 0,
        scheduledDays: initialState.scheduledDays || 0,
        reps: initialState.reps || 0,
        lapses: initialState.lapses || 0,
        state: initialState.state || 0,
        lastReview: null,
        createdAt: new Date(timestamp),
        updatedAt: new Date(timestamp),
      });
    }

    // Update generation record
    await db
      .update(aiGenerations)
      .set({
        cardsGenerated: generatedCards.length,
        status: "completed",
      })
      .where(eq(aiGenerations.id, generationId));

    // Update user AI usage count
    const now = Date.now();
    const oneMonth = 30 * 24 * 60 * 60 * 1000;
    const shouldReset = now - user.aiUsageResetAt > oneMonth;

    await db
      .update(users)
      .set({
        aiUsageCount: shouldReset ? 1 : user.aiUsageCount + 1,
        aiUsageResetAt: shouldReset ? now : user.aiUsageResetAt,
      })
      .where(eq(users.id, userId));

    return c.json({
      generationId,
      cardsGenerated: generatedCards.length,
      remaining: usageCheck.remaining,
    });
  } catch (error) {
    // Update generation record with error
    await db
      .update(aiGenerations)
      .set({
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      })
      .where(eq(aiGenerations.id, generationId));

    return c.json(
      {
        error: "Failed to generate cards",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Generate cards from PDF
app.post("/ai/generate/pdf", async (c) => {
  console.log("[API-PDF] Request received");

  const userSession = await getUserSession(c.req.raw.headers);
  if (!userSession) {
    console.log("[API-PDF] Unauthorized - no session");
    return c.json({ error: "Unauthorized" }, 401);
  }
  const userId = userSession.userId;
  console.log("[API-PDF] User ID:", userId);

  // Get user info for usage check
  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) {
    console.log("[API-PDF] User not found");
    return c.json({ error: "User not found" }, 404);
  }

  // Check AI usage limit
  const usageCheck = checkAIUsageLimit(
    user.plan,
    user.aiUsageCount,
    user.aiUsageResetAt
  );

  if (!usageCheck.allowed) {
    console.log("[API-PDF] Usage limit reached");
    return c.json(
      { error: "AI usage limit reached. Upgrade to Pro for unlimited access." },
      429
    );
  }

  console.log("[API-PDF] Parsing form data...");
  const formData = await c.req.formData();
  const file = formData.get("file") as File;
  const deckId = formData.get("deckId") as string;
  const count = parseInt(formData.get("count") as string) || 10;

  console.log("[API-PDF] Form data:", {
    hasFile: !!file,
    fileName: file?.name,
    fileSize: file?.size,
    deckId,
    count,
  });

  if (!file || !deckId) {
    console.log("[API-PDF] Missing required fields");
    return c.json({ error: "Missing required fields" }, 400);
  }

  const generationId = generateId();
  console.log("[API-PDF] Generation ID:", generationId);

  try {
    // Create generation record
    console.log("[API-PDF] Creating generation record...");
    await db.insert(aiGenerations).values({
      id: generationId,
      userId,
      deckId,
      type: "pdf",
      inputFileName: file.name,
      cardsGenerated: 0,
      status: "pending",
    });

    // Generate cards
    console.log("[API-PDF] Calling generateCardsFromPDF...");
    const generatedCards = await generateCardsFromPDF(file, count);
    console.log("[API-PDF] Cards generated:", generatedCards.length);

    // Insert cards into database
    console.log("[API-PDF] Inserting cards into database...");
    const initialState = getInitialCardState();
    const timestamp = Date.now();

    for (const card of generatedCards) {
      const cardId = generateId();
      await db.insert(cards).values({
        id: cardId,
        deckId,
        front: card.front,
        back: card.back,
        due: initialState.due || timestamp,
        stability: initialState.stability || 0,
        difficulty: initialState.difficulty || 0,
        elapsedDays: initialState.elapsedDays || 0,
        scheduledDays: initialState.scheduledDays || 0,
        reps: initialState.reps || 0,
        lapses: initialState.lapses || 0,
        state: initialState.state || 0,
        lastReview: null,
        createdAt: new Date(timestamp),
        updatedAt: new Date(timestamp),
      });
    }
    console.log("[API-PDF] Cards inserted successfully");

    // Update generation record
    console.log("[API-PDF] Updating generation record...");
    await db
      .update(aiGenerations)
      .set({
        cardsGenerated: generatedCards.length,
        status: "completed",
      })
      .where(eq(aiGenerations.id, generationId));

    // Update user AI usage count
    const now = Date.now();
    const oneMonth = 30 * 24 * 60 * 60 * 1000;
    const shouldReset = now - user.aiUsageResetAt > oneMonth;

    console.log("[API-PDF] User data before update:", {
      aiUsageCount: user.aiUsageCount,
      aiUsageResetAt: user.aiUsageResetAt,
      aiUsageResetAtType: typeof user.aiUsageResetAt,
      shouldReset,
      now,
      nowType: typeof now,
    });

    console.log("[API-PDF] Updating user AI usage...");
    await db
      .update(users)
      .set({
        aiUsageCount: shouldReset ? 1 : user.aiUsageCount + 1,
        aiUsageResetAt: shouldReset ? now : user.aiUsageResetAt,
        updatedAt: new Date(now),
      })
      .where(eq(users.id, userId));

    console.log("[API-PDF] Success!");
    return c.json({
      generationId,
      cardsGenerated: generatedCards.length,
      remaining: usageCheck.remaining,
    });
  } catch (error) {
    console.error("[API-PDF] Error occurred:", error);
    console.error("[API-PDF] Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : "N/A",
    });

    // Update generation record with error
    await db
      .update(aiGenerations)
      .set({
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      })
      .where(eq(aiGenerations.id, generationId));

    return c.json(
      {
        error: "Failed to generate cards",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Generate cards from image
app.post("/ai/generate/image", async (c) => {
  const userSession = await getUserSession(c.req.raw.headers);
  if (!userSession) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const userId = userSession.userId;

  // Get user info for usage check
  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  // Check AI usage limit
  const usageCheck = checkAIUsageLimit(
    user.plan,
    user.aiUsageCount,
    user.aiUsageResetAt
  );

  if (!usageCheck.allowed) {
    return c.json(
      { error: "AI usage limit reached. Upgrade to Pro for unlimited access." },
      429
    );
  }

  const formData = await c.req.formData();
  const file = formData.get("file") as File;
  const deckId = formData.get("deckId") as string;
  const count = parseInt(formData.get("count") as string) || 10;

  if (!file || !deckId) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  const generationId = generateId();

  try {
    // Create generation record
    await db.insert(aiGenerations).values({
      id: generationId,
      userId,
      deckId,
      type: "image",
      inputFileName: file.name,
      cardsGenerated: 0,
      status: "pending",
      createdAt: new Date(),
    });

    // Read image file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate cards
    const generatedCards = await generateCardsFromImage(buffer, count);

    // Insert cards into database
    const initialState = getInitialCardState();
    const timestamp = Date.now();

    for (const card of generatedCards) {
      const cardId = generateId();
      await db.insert(cards).values({
        id: cardId,
        deckId,
        front: card.front,
        back: card.back,
        due: initialState.due || timestamp,
        stability: initialState.stability || 0,
        difficulty: initialState.difficulty || 0,
        elapsedDays: initialState.elapsedDays || 0,
        scheduledDays: initialState.scheduledDays || 0,
        reps: initialState.reps || 0,
        lapses: initialState.lapses || 0,
        state: initialState.state || 0,
        lastReview: null,
        createdAt: new Date(timestamp),
        updatedAt: new Date(timestamp),
      });
    }

    // Update generation record
    await db
      .update(aiGenerations)
      .set({
        cardsGenerated: generatedCards.length,
        status: "completed",
      })
      .where(eq(aiGenerations.id, generationId));

    // Update user AI usage count
    const now = Date.now();
    const oneMonth = 30 * 24 * 60 * 60 * 1000;
    const shouldReset = now - user.aiUsageResetAt > oneMonth;

    await db
      .update(users)
      .set({
        aiUsageCount: shouldReset ? 1 : user.aiUsageCount + 1,
        aiUsageResetAt: shouldReset ? now : user.aiUsageResetAt,
      })
      .where(eq(users.id, userId));

    return c.json({
      generationId,
      cardsGenerated: generatedCards.length,
      remaining: usageCheck.remaining,
    });
  } catch (error) {
    // Update generation record with error
    await db
      .update(aiGenerations)
      .set({
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      })
      .where(eq(aiGenerations.id, generationId));

    return c.json(
      {
        error: "Failed to generate cards",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Get AI generation history
app.get("/ai/generations", async (c) => {
  const userSession = await getUserSession(c.req.raw.headers);
  if (!userSession) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const userId = userSession.userId;

  const generations = await db
    .select()
    .from(aiGenerations)
    .where(eq(aiGenerations.userId, userId))
    .orderBy(desc(aiGenerations.createdAt))
    .limit(50)
    .all();

  return c.json(generations);
});

// Get AI usage stats
app.get("/ai/usage", async (c) => {
  const userSession = await getUserSession(c.req.raw.headers);
  if (!userSession) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const userId = userSession.userId;

  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  const usageCheck = checkAIUsageLimit(
    user.plan,
    user.aiUsageCount,
    user.aiUsageResetAt
  );

  return c.json({
    plan: user.plan,
    usageCount: user.aiUsageCount,
    remaining: usageCheck.remaining,
    resetAt: user.aiUsageResetAt,
    unlimited: user.plan === "pro",
  });
});

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
