import { FSRS, Rating, State, type Card, type RecordLog, type Grade } from "ts-fsrs";
import type { Card as DBCard } from "../db/schema";

// Initialize FSRS instance with default parameters
const fsrs = new FSRS({});

/**
 * Convert database card to FSRS card
 */
export function dbCardToFSRS(dbCard: DBCard): Card {
  return {
    due: new Date(dbCard.due),
    stability: dbCard.stability,
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
  return {
    due: fsrsCard.due.getTime(),
    stability: fsrsCard.stability,
    difficulty: fsrsCard.difficulty,
    elapsedDays: fsrsCard.elapsed_days,
    scheduledDays: fsrsCard.scheduled_days,
    reps: fsrsCard.reps,
    lapses: fsrsCard.lapses,
    state: fsrsCard.state,
    lastReview: fsrsCard.last_review ? fsrsCard.last_review.getTime() : null,
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
  const fsrsCard = dbCardToFSRS(dbCard);
  const schedulingCards = fsrs.repeat(fsrsCard, reviewTime);

  // Get the card based on rating (excluding Manual rating)
  const gradeRating = rating as Grade;
  const result = schedulingCards[gradeRating];

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

