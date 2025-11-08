import { database, generateId, now } from "@/lib/db";
import type { Card, Deck } from "@/lib/db/schema";
import { parseApkgFile, type ImportResult } from "@/lib/utils/apkg-import";
import { getInitialCardState, Rating, reviewCard } from "@/lib/utils/fsrs";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { handle } from "hono/vercel";

// Create Hono app
const app = new Hono().basePath("/api");

// Middleware
app.use("*", cors());
app.use("*", logger());

// Health check
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: now() });
});

// ============================================
// Decks API
// ============================================

// Get all decks for a user
app.get("/decks", (c) => {
  // TODO: Get user_id from auth session
  const userId = "demo-user"; // Temporary

  const decks = database
    .query<Deck, [string]>(
      "SELECT * FROM decks WHERE user_id = ? ORDER BY created_at DESC"
    )
    .all(userId);

  return c.json(decks);
});

// Get deck by ID
app.get("/decks/:id", (c) => {
  const id = c.req.param("id");
  const deck = database
    .query<Deck, [string]>("SELECT * FROM decks WHERE id = ?")
    .get(id);

  if (!deck) {
    return c.json({ error: "Deck not found" }, 404);
  }

  return c.json(deck);
});

// Create deck
app.post("/decks", async (c) => {
  const body = await c.req.json<{ name: string; description?: string }>();

  // TODO: Get user_id from auth session
  const userId = "demo-user";

  const id = generateId();
  const timestamp = now();

  database
    .query(
      "INSERT INTO decks (id, user_id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(id, userId, body.name, body.description || null, timestamp, timestamp);

  const deck = database
    .query<Deck, [string]>("SELECT * FROM decks WHERE id = ?")
    .get(id);

  return c.json(deck, 201);
});

// Update deck
app.put("/decks/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{ name?: string; description?: string }>();

  const deck = database
    .query<Deck, [string]>("SELECT * FROM decks WHERE id = ?")
    .get(id);

  if (!deck) {
    return c.json({ error: "Deck not found" }, 404);
  }

  const timestamp = now();
  database
    .query(
      "UPDATE decks SET name = ?, description = ?, updated_at = ? WHERE id = ?"
    )
    .run(
      body.name || deck.name,
      body.description || deck.description,
      timestamp,
      id
    );

  const updatedDeck = database
    .query<Deck, [string]>("SELECT * FROM decks WHERE id = ?")
    .get(id);

  return c.json(updatedDeck);
});

// Delete deck
app.delete("/decks/:id", (c) => {
  const id = c.req.param("id");

  const result = database.query("DELETE FROM decks WHERE id = ?").run(id);

  if (result.changes === 0) {
    return c.json({ error: "Deck not found" }, 404);
  }

  return c.json({ success: true });
});

// ============================================
// Cards API
// ============================================

// Get cards in a deck
app.get("/decks/:deckId/cards", (c) => {
  const deckId = c.req.param("deckId");

  const cards = database
    .query<Card, [string]>(
      "SELECT * FROM cards WHERE deck_id = ? ORDER BY created_at DESC"
    )
    .all(deckId);

  return c.json(cards);
});

// Get card by ID
app.get("/cards/:id", (c) => {
  const id = c.req.param("id");

  const card = database
    .query<Card, [string]>("SELECT * FROM cards WHERE id = ?")
    .get(id);

  if (!card) {
    return c.json({ error: "Card not found" }, 404);
  }

  return c.json(card);
});

// Create card
app.post("/cards", async (c) => {
  const body = await c.req.json<{
    deck_id: string;
    front: string;
    back: string;
  }>();

  const id = generateId();
  const timestamp = now();
  const initialState = getInitialCardState();

  database
    .query(
      `INSERT INTO cards (
        id, deck_id, front, back, 
        due, stability, difficulty, elapsed_days, scheduled_days, 
        reps, lapses, state, last_review, 
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      body.deck_id,
      body.front,
      body.back,
      initialState.due ?? timestamp,
      initialState.stability ?? 0,
      initialState.difficulty ?? 0,
      initialState.elapsed_days ?? 0,
      initialState.scheduled_days ?? 0,
      initialState.reps ?? 0,
      initialState.lapses ?? 0,
      initialState.state ?? 0,
      initialState.last_review ?? null,
      timestamp,
      timestamp
    );

  const card = database
    .query<Card, [string]>("SELECT * FROM cards WHERE id = ?")
    .get(id);

  return c.json(card, 201);
});

// Update card
app.put("/cards/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{ front?: string; back?: string }>();

  const card = database
    .query<Card, [string]>("SELECT * FROM cards WHERE id = ?")
    .get(id);

  if (!card) {
    return c.json({ error: "Card not found" }, 404);
  }

  const timestamp = now();
  database
    .query("UPDATE cards SET front = ?, back = ?, updated_at = ? WHERE id = ?")
    .run(body.front || card.front, body.back || card.back, timestamp, id);

  const updatedCard = database
    .query<Card, [string]>("SELECT * FROM cards WHERE id = ?")
    .get(id);

  return c.json(updatedCard);
});

// Delete card
app.delete("/cards/:id", (c) => {
  const id = c.req.param("id");

  const result = database.query("DELETE FROM cards WHERE id = ?").run(id);

  if (result.changes === 0) {
    return c.json({ error: "Card not found" }, 404);
  }

  return c.json({ success: true });
});

// Get due cards
app.get("/cards/due", (c) => {
  const userId = "demo-user"; // TODO: Get from auth
  const currentTime = now();

  const cards = database
    .query<Card, [string, number]>(
      `SELECT c.* FROM cards c 
       INNER JOIN decks d ON c.deck_id = d.id 
       WHERE d.user_id = ? AND c.due <= ?
       ORDER BY c.due ASC`
    )
    .all(userId, currentTime);

  return c.json(cards);
});

// ============================================
// Reviews API
// ============================================

// Submit a review
app.post("/reviews", async (c) => {
  const body = await c.req.json<{ card_id: string; rating: number }>();

  const card = database
    .query<Card, [string]>("SELECT * FROM cards WHERE id = ?")
    .get(body.card_id);

  if (!card) {
    return c.json({ error: "Card not found" }, 404);
  }

  // Process review with FSRS
  const { card: updatedCardData, log } = reviewCard(
    card,
    body.rating as Rating
  );

  // Update card
  const timestamp = now();
  database
    .query(
      `UPDATE cards SET 
        due = ?, stability = ?, difficulty = ?, elapsed_days = ?, 
        scheduled_days = ?, reps = ?, lapses = ?, state = ?, 
        last_review = ?, updated_at = ?
       WHERE id = ?`
    )
    .run(
      updatedCardData.due ?? card.due,
      updatedCardData.stability ?? card.stability,
      updatedCardData.difficulty ?? card.difficulty,
      updatedCardData.elapsed_days ?? card.elapsed_days,
      updatedCardData.scheduled_days ?? card.scheduled_days,
      updatedCardData.reps ?? card.reps,
      updatedCardData.lapses ?? card.lapses,
      updatedCardData.state ?? card.state,
      updatedCardData.last_review ?? card.last_review,
      timestamp,
      body.card_id
    );

  // Save review record
  const reviewId = generateId();
  database
    .query(
      "INSERT INTO reviews (id, card_id, rating, review_time) VALUES (?, ?, ?, ?)"
    )
    .run(reviewId, body.card_id, body.rating, timestamp);

  const updatedCard = database
    .query<Card, [string]>("SELECT * FROM cards WHERE id = ?")
    .get(body.card_id);

  return c.json({ card: updatedCard, log });
});

// Get statistics
app.get("/stats", (c) => {
  const userId = "demo-user"; // TODO: Get from auth

  const stats = {
    totalDecks:
      database
        .query<{ count: number }, [string]>(
          "SELECT COUNT(*) as count FROM decks WHERE user_id = ?"
        )
        .get(userId)?.count || 0,
    totalCards:
      database
        .query<{ count: number }, [string]>(
          `SELECT COUNT(*) as count FROM cards c 
         INNER JOIN decks d ON c.deck_id = d.id 
         WHERE d.user_id = ?`
        )
        .get(userId)?.count || 0,
    dueCards:
      database
        .query<{ count: number }, [string, number]>(
          `SELECT COUNT(*) as count FROM cards c 
         INNER JOIN decks d ON c.deck_id = d.id 
         WHERE d.user_id = ? AND c.due <= ?`
        )
        .get(userId, now())?.count || 0,
    reviewsToday:
      database
        .query<{ count: number }, [string, number]>(
          `SELECT COUNT(*) as count FROM reviews r
         INNER JOIN cards c ON r.card_id = c.id
         INNER JOIN decks d ON c.deck_id = d.id
         WHERE d.user_id = ? AND r.review_time >= ?`
        )
        .get(userId, Date.now() - 24 * 60 * 60 * 1000)?.count || 0,
  };

  return c.json(stats);
});

// Get detailed statistics for charts
app.get("/stats/detailed", (c) => {
  const userId = "demo-user"; // TODO: Get from auth
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  // Get daily review counts for the past 30 days
  const dailyReviews = database
    .query<{ date: string; count: number }, [string, number]>(
      `SELECT 
        date(review_time / 1000, 'unixepoch') as date,
        COUNT(*) as count
       FROM reviews r
       INNER JOIN cards c ON r.card_id = c.id
       INNER JOIN decks d ON c.deck_id = d.id
       WHERE d.user_id = ? AND r.review_time >= ?
       GROUP BY date(review_time / 1000, 'unixepoch')
       ORDER BY date ASC`
    )
    .all(userId, thirtyDaysAgo);

  // Get card state distribution
  const cardStates = database
    .query<{ state: number; count: number }, [string]>(
      `SELECT c.state, COUNT(*) as count
       FROM cards c
       INNER JOIN decks d ON c.deck_id = d.id
       WHERE d.user_id = ?
       GROUP BY c.state`
    )
    .all(userId);

  // Get average retention (cards reviewed with rating >= 2)
  const retentionData = database
    .query<{ total: number; passed: number }, [string, number]>(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN r.rating >= 2 THEN 1 ELSE 0 END) as passed
       FROM reviews r
       INNER JOIN cards c ON r.card_id = c.id
       INNER JOIN decks d ON c.deck_id = d.id
       WHERE d.user_id = ? AND r.review_time >= ?`
    )
    .get(userId, thirtyDaysAgo);

  const retention = retentionData?.total
    ? ((retentionData.passed / retentionData.total) * 100).toFixed(1)
    : "0";

  return c.json({
    dailyReviews,
    cardStates,
    retention,
  });
});

// Import APKG
app.post("/import/apkg", async (c) => {
  const userId = "demo-user"; // TODO: Get from auth

  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Read file as ArrayBuffer
    const fileBuffer = await file.arrayBuffer();

    // Parse the .apkg file
    const { notes, cards, decks } = await parseApkgFile(fileBuffer);

    const errors: string[] = [];
    let decksImported = 0;
    let cardsImported = 0;

    // Import decks
    const deckIdMap = new Map<number, string>(); // Map Anki deck ID to our deck ID
    for (const [ankiDeckId, ankiDeck] of decks.entries()) {
      // Skip default deck
      if (ankiDeckId === 1 || ankiDeck.name === "Default") {
        continue;
      }

      try {
        const newDeckId = generateId();
        const timestamp = now();

        database
          .query(
            "INSERT INTO decks (id, user_id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
          )
          .run(
            newDeckId,
            userId,
            ankiDeck.name,
            ankiDeck.desc || null,
            timestamp,
            timestamp
          );

        deckIdMap.set(ankiDeckId, newDeckId);
        decksImported++;
      } catch (err) {
        errors.push(`Failed to import deck "${ankiDeck.name}": ${err}`);
      }
    }

    // Create a map of notes for quick lookup
    const notesMap = new Map(notes.map((note) => [note.id, note]));

    // Import cards
    for (const ankiCard of cards) {
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
        const timestamp = now();

        // Convert Anki state to our FSRS state
        const initialState = getInitialCardState();

        database
          .query(
            `INSERT INTO cards (
              id, deck_id, front, back, 
              due, stability, difficulty, elapsed_days, scheduled_days, 
              reps, lapses, state, last_review, 
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            newCardId,
            deckId,
            front,
            back,
            timestamp + ankiCard.due * 86400000, // Convert days to ms from now
            initialState.stability ?? 0,
            initialState.difficulty ?? 0,
            0, // Reset elapsed_days
            ankiCard.ivl, // Use Anki's interval as scheduled_days
            ankiCard.reps,
            ankiCard.lapses,
            ankiCard.type, // Use Anki type as state
            null,
            timestamp,
            timestamp
          );

        cardsImported++;
      } catch (err) {
        errors.push(`Failed to import card ${ankiCard.id}: ${err}`);
      }
    }

    const result: ImportResult = {
      decksImported,
      cardsImported,
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

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
