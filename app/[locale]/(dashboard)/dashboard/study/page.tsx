"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FSRS, Rating, State, type Card as FSRSCard } from "ts-fsrs";

interface Card {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  due: number;
  stability: number;
  difficulty: number;
  reps: number;
  state: number; // 0=New, 1=Learning, 2=Review, 3=Relearning
  lapses: number;
  elapsedDays?: number;
  scheduledDays?: number;
  lastReview?: number | null;
}

// Initialize FSRS on client side (Anki-like short learning steps)
// learning_steps / relearning_steps 例: 1分 -> 1m, 10分 -> 10m
// request_retention は 0.9 前後が FSRS 推奨レンジ
const fsrs = new FSRS({
  learning_steps: ["1m", "10m"],
  relearning_steps: ["10m"],
  request_retention: 0.9,
});

// Convert database card to FSRS card
function cardToFSRS(card: Card): FSRSCard {
  const stability = card.stability === 0 && card.reps > 0
    ? Math.max(0.1, card.scheduledDays || 1)
    : card.stability === 0
      ? 0.1
      : card.stability;

  return {
    due: new Date(card.due),
    stability: stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsedDays || 0,
    scheduled_days: card.scheduledDays || 0,
    // learning_steps: 現在の学習ステップインデックス (Anki的には 0 から開始)
    learning_steps: 0,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as State,
    last_review: card.lastReview ? new Date(card.lastReview) : undefined,
  };
}

// Convert FSRS card back to our Card format
function fsrsToCard(fsrsCard: FSRSCard, originalCard: Card): Card {
  return {
    ...originalCard,
    due: fsrsCard.due instanceof Date ? fsrsCard.due.getTime() : Number(fsrsCard.due),
    stability: fsrsCard.stability,
    difficulty: fsrsCard.difficulty,
    elapsedDays: fsrsCard.elapsed_days,
    scheduledDays: fsrsCard.scheduled_days,
    reps: fsrsCard.reps,
    lapses: fsrsCard.lapses,
    state: fsrsCard.state,
    lastReview: fsrsCard.last_review
      ? (fsrsCard.last_review instanceof Date ? fsrsCard.last_review.getTime() : Number(fsrsCard.last_review))
      : null,
  };
}

export default function StudyPage() {
  const searchParams = useSearchParams();
  const deckId = searchParams.get("deck");

  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);

  // --- Timer State Changes ---
  const [totalElapsedTime, setTotalElapsedTime] = useState<number>(0);
  const [cardStartTime, setCardStartTime] = useState<number>(0);
  const [cardElapsedTime, setCardElapsedTime] = useState<number>(0);
  // keep a ref to the active interval id so we can clear it deterministically
  const cardTimerRef = useRef<number | null>(null);
  // track if we've started the timer for the first card
  const hasStartedTimerRef = useRef(false);

  // Ref to hold the latest state for cleanup function on unmount
  const latestState = useRef({
    totalElapsedTime,
    cardElapsedTime,
    currentIndex,
    finished,
    deckId,
  });
  useEffect(() => {
    latestState.current = {
      totalElapsedTime,
      cardElapsedTime,
      currentIndex,
      finished,
      deckId,
    };
  });
  // --- End of Timer State Changes ---

  useEffect(() => {
    fetchDueCards();

    // Cleanup function to save abandoned sessions
    return () => {
      const state = latestState.current;
      if (!state.finished && state.currentIndex > 0) {
        const duration = state.totalElapsedTime + state.cardElapsedTime;
        fetch("/api/study-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deckId: state.deckId,
            duration,
            cardsReviewed: state.currentIndex,
          }),
        });
      }
    };
  }, [deckId]);

  // --- New Timer Effects ---
  // This effect runs the timer for the current card.
  // We increment `cardElapsedTime` each second and hold the interval id in `cardTimerRef`
  useEffect(() => {
    // clear any existing interval first to avoid duplicates
    if (cardTimerRef.current) {
      clearInterval(cardTimerRef.current);
      cardTimerRef.current = null;
    }

    // Only run timer when we have started and haven't shown answer yet
    if (cardStartTime > 0 && !showAnswer && !finished && !loading) {
      // Start a 1s ticking interval that increments elapsed seconds.
      cardTimerRef.current = window.setInterval(() => {
        setCardElapsedTime((prev) => prev + 1);
      }, 1000) as unknown as number;
    }

    return () => {
      if (cardTimerRef.current) {
        clearInterval(cardTimerRef.current);
        cardTimerRef.current = null;
      }
    };
  }, [cardStartTime, showAnswer, finished, loading]);

  // This effect resets the timer when a new card is shown
  useEffect(() => {
    // Only start timer once cards are loaded and we haven't finished
    if (!loading && cards.length > 0 && currentIndex < cards.length && !finished) {
      // Reset timer for new card
      setCardStartTime(Date.now());
      setCardElapsedTime(0);
      hasStartedTimerRef.current = true;
    }
  }, [currentIndex, loading, cards.length, finished]);
  // --- End of New Timer Effects ---

  const fetchDueCards = () => {
    let url = "/api/cards/due";

    if (deckId) {
      // デッキ指定時は子デッキも含める
      url = `/api/decks/${deckId}/cards?includeChildren=true&limit=1000`;
    }

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        // ページネーション対応の場合とそうでない場合を処理
        let allCards: Card[] = [];

        if (Array.isArray(data)) {
          // 配列の場合（/api/cards/due）
          allCards = data;
        } else if (data.cards && Array.isArray(data.cards)) {
          // ページネーション形式の場合（/api/decks/:id/cards）
          allCards = data.cards;
        }

        const now = Date.now();
        const gracePeriod = 10 * 60 * 1000; // 10 minutes grace period

        // Include cards that are due now OR will be due within grace period
        // This allows users to continue studying learning cards without waiting
        const dueCards = allCards.filter((card: Card) => {
          // New cards (state 0) - always include if due
          if (card.state === 0 && card.due <= now) {
            return true;
          }
          // Learning/Relearning cards (state 1, 3) - include with grace period
          if ((card.state === 1 || card.state === 3) && card.due <= now + gracePeriod) {
            return true;
          }
          // Review cards (state 2) - only include if actually due
          if (card.state === 2 && card.due <= now) {
            return true;
          }
          return false;
        });

        console.log("Fetched cards:", {
          total: allCards.length,
          filtered: dueCards.length,
          byState: {
            new: dueCards.filter(c => c.state === 0).length,
            learning: dueCards.filter(c => c.state === 1 || c.state === 3).length,
            review: dueCards.filter(c => c.state === 2).length,
          }
        });

        setCards(dueCards);
        setLoading(false);
        if (dueCards.length === 0) {
          setFinished(true);
        }
      })
      .catch((error) => {
        console.error("Failed to fetch cards:", error);
        setLoading(false);
      });
  };

  const submitReview = async (rating: number) => {
    const currentCard = cards[currentIndex];
    if (!currentCard) return;

    // Stop the current card timer immediately
    if (cardTimerRef.current) {
      clearInterval(cardTimerRef.current);
      cardTimerRef.current = null;
    }

    const newTotalElapsedTime = totalElapsedTime + cardElapsedTime;

    // *** CLIENT-SIDE FSRS CALCULATION ***
    // Calculate next state immediately on the client for instant UI update
    const fsrsCard = cardToFSRS(currentCard);
    const reviewTime = new Date();
    const schedulingCards = fsrs.repeat(fsrsCard, reviewTime);

    // Get the result based on rating (1=Again, 2=Hard, 3=Good, 4=Easy)
    let selectedResult;
    if (rating === 1) selectedResult = schedulingCards[Rating.Again];
    else if (rating === 2) selectedResult = schedulingCards[Rating.Hard];
    else if (rating === 3) selectedResult = schedulingCards[Rating.Good];
    else selectedResult = schedulingCards[Rating.Easy];

    const optimisticCard = fsrsToCard(selectedResult.card, currentCard);

    // Immediately update UI with optimistic result
    const updatedCards = [...cards];
    updatedCards[currentIndex] = optimisticCard;

    // Anki-like requeue for short learning/relearning steps
    // 短い学習ステップ(例: 1m/10m)内で次回が来るカードは、配列に再挿入してセッション中に再出現させる
    const REQUEUE_WINDOW_MS = 15 * 60 * 1000; // 15分以内のものは再キュー
    const nowMs = Date.now();
    const isLearningLike =
      optimisticCard.state === State.Learning || optimisticCard.state === State.Relearning;
    const shouldRequeue = isLearningLike && optimisticCard.due <= nowMs + REQUEUE_WINDOW_MS;

    // Check if this is the last card BEFORE moving to next
    const isLastCard = currentIndex + 1 >= updatedCards.length;

    if (shouldRequeue) {
      // 現在のカードをいったん取り除いて due 昇順で再挿入
      const withoutCurrent = updatedCards.filter((_, i) => i !== currentIndex);
      // 挿入位置(単純に due 昇順で見つける)
      let insertIdx = withoutCurrent.findIndex((c) => c.due > optimisticCard.due);
      if (insertIdx === -1) insertIdx = withoutCurrent.length;
      const newArr = [
        ...withoutCurrent.slice(0, insertIdx),
        optimisticCard,
        ...withoutCurrent.slice(insertIdx),
      ];

      setCards(newArr);
      // currentIndex は据え置き。いままでの次のカードが新しい先頭として表示される
      setShowAnswer(false);
      setTotalElapsedTime(newTotalElapsedTime);

      // Reset card timer state (will be restarted by useEffect)
      setCardElapsedTime(0);
      setCardStartTime(0);

      // セッション完了判定（全て消費済みなら終了）
      if (newArr.length === 0) {
        setFinished(true);
      }
    } else if (isLastCard) {
      // Update everything for completion
      setCards(updatedCards);
      setFinished(true);
      setCardElapsedTime(0);
      setCardStartTime(0);
      setTotalElapsedTime(newTotalElapsedTime);

      // Save session on completion (async)
      fetch("/api/study-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deckId,
          duration: newTotalElapsedTime,
          cardsReviewed: currentIndex + 1,
        }),
      });
    } else {
      // Update cards, index, and other state together in React 18's automatic batching
      // This ensures the UI shows the updated stats briefly before moving to next card
      setCards(updatedCards);
      setCurrentIndex((idx) => idx + 1);
      setShowAnswer(false);
      setTotalElapsedTime(newTotalElapsedTime);

      // Reset card timer state (will be restarted by useEffect)
      setCardElapsedTime(0);
      setCardStartTime(0);
    }

    // Send review to server in background (don't wait for response)
    // This ensures the database is updated even if client closes
    // Send the pre-calculated FSRS data to avoid redundant calculations
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: currentCard.id,
          rating,
          cardData: {
            due: optimisticCard.due,
            stability: optimisticCard.stability,
            difficulty: optimisticCard.difficulty,
            elapsedDays: optimisticCard.elapsedDays || 0,
            scheduledDays: optimisticCard.scheduledDays || 0,
            reps: optimisticCard.reps,
            lapses: optimisticCard.lapses,
            state: optimisticCard.state,
            lastReview: optimisticCard.lastReview || Date.now(),
          },
        }),
      });

      const result = await response.json();

      // Server update confirmed
    } catch (error) {
      console.error("Failed to submit review to server:", error);
      // TODO: Could implement retry logic or offline queue here
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-zinc-600 dark:text-zinc-400">読み込み中...</div>
      </div>
    );
  }

  if (finished || cards.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-12 text-center shadow-sm border border-zinc-200 dark:border-zinc-800">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
            お疲れ様でした!
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mb-8">
            {cards.length === 0
              ? "復習予定のカードはありません"
              : "すべてのカードの復習が完了しました"}
          </p>
          <a
            href="/dashboard"
            className="inline-block px-8 py-3 bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 rounded-xl font-medium hover:scale-105 transition-transform"
          >
            ダッシュボードに戻る
          </a>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  // Calculate stats based on remaining cards (from currentIndex onwards)
  // Always include current card until it's actually reviewed (rating button pressed)
  const totalCards = cards.length;
  const remainingCards = totalCards - currentIndex;

  // Count remaining cards that haven't been reviewed yet
  // This includes the current card being displayed
  const remainingCardsList = cards.slice(currentIndex);

  const remainingNew = remainingCardsList.filter((c) => c.state === 0).length;
  const remainingLearning = remainingCardsList.filter((c) => c.state === 1 || c.state === 3).length;
  const remainingReview = remainingCardsList.filter((c) => c.state === 2).length;

  // Get current card state label
  const getStateLabel = (state: number) => {
    switch (state) {
      case 0: return "新規";
      case 1: return "学習中";
      case 2: return "復習";
      case 3: return "再学習";
      default: return "不明";
    }
  };

  const getStateColor = (state: number) => {
    switch (state) {
      case 0: return "text-blue-600 dark:text-blue-400";
      case 1: return "text-yellow-600 dark:text-yellow-400";
      case 2: return "text-green-600 dark:text-green-400";
      case 3: return "text-orange-600 dark:text-orange-400";
      default: return "text-zinc-600 dark:text-zinc-400";
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header with improved progress display */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">学習</h1>
          <div className="mt-2 space-y-1">
            <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              {currentIndex + 1} / {totalCards}
            </p>
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${currentCard.state === 0 ? "bg-blue-100 dark:bg-blue-900/30" :
              currentCard.state === 1 ? "bg-yellow-100 dark:bg-yellow-900/30" :
                currentCard.state === 2 ? "bg-green-100 dark:bg-green-900/30" :
                  "bg-orange-100 dark:bg-orange-900/30"
              } ${getStateColor(currentCard.state)}`}>
              <span className="w-2 h-2 rounded-full bg-current"></span>
              {getStateLabel(currentCard.state)}
            </div>
          </div>
        </div>

        {/* Stats in top right */}
        <div className="text-right space-y-2">
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {formatTime(totalElapsedTime + cardElapsedTime)}
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-end gap-2">
              <span className="text-zinc-500 dark:text-zinc-400">新規:</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {remainingNew}
              </span>
            </div>
            <div className="flex items-center justify-end gap-2">
              <span className="text-zinc-500 dark:text-zinc-400">学習:</span>
              <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                {remainingLearning}
              </span>
            </div>
            <div className="flex items-center justify-end gap-2">
              <span className="text-zinc-500 dark:text-zinc-400">復習:</span>
              <span className="font-semibold text-green-600 dark:text-green-400">
                {remainingReview}
              </span>
            </div>
            <div className="pt-1 border-t border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center justify-end gap-2">
                <span className="text-zinc-500 dark:text-zinc-400">残り:</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                  {remainingCards}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="p-12 min-h-[300px] flex items-center justify-center">
          <div className="text-center space-y-8 w-full">
            <div className="text-2xl font-medium text-zinc-900 dark:text-zinc-100">
              {currentCard.front}
            </div>

            {showAnswer && (
              <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800">
                <div className="text-xl text-zinc-600 dark:text-zinc-400">
                  {currentCard.back}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 bg-zinc-50 dark:bg-zinc-800 border-t border-zinc-200 dark:border-zinc-700">
          {!showAnswer ? (
            <button
              onClick={() => {
                // Stop timer when showing answer
                if (cardTimerRef.current) {
                  clearInterval(cardTimerRef.current);
                  cardTimerRef.current = null;
                }
                setShowAnswer(true);
              }}
              className="w-full py-4 bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 rounded-xl font-medium hover:scale-105 transition-transform"
            >
              答えを表示
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-center text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                どのくらい覚えていましたか?
              </p>
              <div className="grid grid-cols-4 gap-3">
                <button
                  onClick={() => submitReview(1)}
                  className="py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                >
                  <div className="text-xs mb-1">Again</div>
                  <div className="text-sm">&lt;1分</div>
                </button>
                <button
                  onClick={() => submitReview(2)}
                  className="py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
                >
                  <div className="text-xs mb-1">Hard</div>
                  <div className="text-sm">数分</div>
                </button>
                <button
                  onClick={() => submitReview(3)}
                  className="py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                >
                  <div className="text-xs mb-1">Good</div>
                  <div className="text-sm">数日</div>
                </button>
                <button
                  onClick={() => submitReview(4)}
                  className="py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                >
                  <div className="text-xs mb-1">Easy</div>
                  <div className="text-sm">数週間</div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 text-sm text-zinc-500 dark:text-zinc-500">
        <span>復習回数: {currentCard.reps}</span>
        <span>•</span>
        <span>難易度: {currentCard.difficulty.toFixed(1)}</span>
        <span>•</span>
        <span>失敗: {currentCard.lapses}</span>
      </div>
    </div>
  );
}
