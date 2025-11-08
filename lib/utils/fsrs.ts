import { FSRS, Rating, State, type Card, type Grade } from "ts-fsrs";
import type { Card as DBCard } from "../db/schema";

// Initialize FSRS instance with default parameters
const fsrs = new FSRS({});

/**
 * Convert database card to FSRS card
 */
export function dbCardToFSRS(dbCard: DBCard): Card {
  const dueDate = new Date(dbCard.due);

  // IMPORTANT: FSRS requires non-zero stability for existing cards
  // If stability is 0 but the card has been reviewed (reps > 0),
  // we need to calculate a reasonable initial stability
  let stability = dbCard.stability;
  if (stability === 0 && dbCard.reps > 0) {
    // Estimate stability based on scheduled_days
    // For reviewed cards, use scheduled_days as a baseline
    stability = Math.max(0.1, dbCard.scheduledDays || 1);
    console.warn(
      `Card ${dbCard.id} has stability=0 with reps=${dbCard.reps}. Setting stability to ${stability}`
    );
  } else if (stability === 0) {
    // For truly new cards, use minimal stability
    stability = 0.1;
  }

  console.log("dbCardToFSRS:", {
    inputDue: dbCard.due,
    dueDate: dueDate,
    dueDateIsValid: !isNaN(dueDate.getTime()),
    originalStability: dbCard.stability,
    adjustedStability: stability,
    difficulty: dbCard.difficulty,
    reps: dbCard.reps,
  });

  return {
    due: dueDate,
    stability: stability,
    difficulty: dbCard.difficulty,
    elapsed_days: dbCard.elapsedDays,
    scheduled_days: dbCard.scheduledDays,
    learning_steps: 0, // Required in ts-fsrs v5+
    reps: dbCard.reps,
    lapses: dbCard.lapses,
    state: dbCard.state as State,
    last_review: dbCard.lastReview ? new Date(dbCard.lastReview) : undefined,
  };
}

/**
 * Convert FSRS card to database card fields
 */
export function fsrsCardToDB(fsrsCard: Card): Partial<DBCard> {
  const due =
    fsrsCard.due instanceof Date
      ? fsrsCard.due.getTime()
      : Number(fsrsCard.due);

  console.log("fsrsCardToDB:", {
    inputDue: fsrsCard.due,
    outputDue: due,
    outputDueIsNaN: Number.isNaN(due),
    stability: fsrsCard.stability,
    difficulty: fsrsCard.difficulty,
  });

  return {
    due,
    stability: fsrsCard.stability,
    difficulty: fsrsCard.difficulty,
    elapsedDays: fsrsCard.elapsed_days,
    scheduledDays: fsrsCard.scheduled_days,
    reps: fsrsCard.reps,
    lapses: fsrsCard.lapses,
    state: fsrsCard.state,
    lastReview: fsrsCard.last_review
      ? fsrsCard.last_review instanceof Date
        ? fsrsCard.last_review.getTime()
        : Number(fsrsCard.last_review)
      : null,
  };
}

/**
 * Process a card review and return updated card data
 */
export function reviewCard(
  dbCard: DBCard,
  rating: Rating,
  reviewTime: Date = new Date()
): { card: Partial<DBCard>; log: any } {
  console.log("reviewCard called with:", {
    cardId: dbCard.id,
    rating,
    reviewTime,
  });

  const fsrsCard = dbCardToFSRS(dbCard);
  console.log("FSRS card created:", fsrsCard);

  const schedulingCards = fsrs.repeat(fsrsCard, reviewTime);
  console.log("Scheduling cards:", schedulingCards);

  // Get the card based on rating (excluding Manual rating)
  const gradeRating = rating as Grade;
  const result = schedulingCards[gradeRating];

  console.log("Selected result for rating", gradeRating, ":", result);

  return {
    card: fsrsCardToDB(result.card),
    log: result.log,
  };
}

/**
 * Get initial card state for a new card
 */
export function getInitialCardState(): Partial<DBCard> {
  const now = new Date();
  const emptyCard: Card = {
    due: now,
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    learning_steps: 0,
    reps: 0,
    lapses: 0,
    state: State.New,
    last_review: undefined,
  };
  return fsrsCardToDB(emptyCard);
}

/**
 * Get cards due for review
 */
export function isDue(dbCard: DBCard, now: Date = new Date()): boolean {
  return dbCard.due <= now.getTime();
}

/**
 * Calculate next review intervals for all ratings
 */
export function getNextIntervals(
  dbCard: DBCard,
  reviewTime: Date = new Date()
) {
  const fsrsCard = dbCardToFSRS(dbCard);
  const schedulingCards = fsrs.repeat(fsrsCard, reviewTime);

  return {
    again: schedulingCards[Rating.Again].card.scheduled_days,
    hard: schedulingCards[Rating.Hard].card.scheduled_days,
    good: schedulingCards[Rating.Good].card.scheduled_days,
    easy: schedulingCards[Rating.Easy].card.scheduled_days,
  };
}

export { Rating, State };
