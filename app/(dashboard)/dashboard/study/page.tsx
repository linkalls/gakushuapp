"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface Card {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  due: number;
  stability: number;
  difficulty: number;
  reps: number;
}

export default function StudyPage() {
  const searchParams = useSearchParams();
  const deckId = searchParams.get("deck");

  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);
  const [studyStartTime, setStudyStartTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [reviewedCount, setReviewedCount] = useState<number>(0);

  useEffect(() => {
    fetchDueCards();
    setStudyStartTime(Date.now());
  }, [deckId]);

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      if (studyStartTime > 0 && !finished) {
        setElapsedTime(Math.floor((Date.now() - studyStartTime) / 1000));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [studyStartTime, finished]);

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

        const dueCards = allCards.filter((card: Card) => card.due <= Date.now());
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

    try {
      await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: currentCard.id,
          rating,
        }),
      });

      // Increment reviewed count
      setReviewedCount((prev) => prev + 1);

      // Move to next card
      if (currentIndex + 1 >= cards.length) {
        setFinished(true);
      } else {
        setCurrentIndex(currentIndex + 1);
        setShowAnswer(false);
      }
    } catch (error) {
      console.error("Failed to submit review:", error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const newCardsCount = cards.filter((card) => card.reps === 0).length;
  const reviewCardsCount = cards.filter((card) => card.reps > 0).length;

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

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header with stats in top right */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">学習</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            {currentIndex + 1} / {cards.length} カード
          </p>
        </div>

        {/* Stats in top right - matching the image */}
        <div className="flex items-center gap-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
          <span className="text-zinc-900 dark:text-zinc-100">{reviewedCount}</span>
          <span className="text-zinc-400">+</span>
          <span className="text-blue-600 dark:text-blue-400">{newCardsCount - reviewedCount > 0 ? newCardsCount - reviewedCount : 0}</span>
          <span className="text-zinc-400">+</span>
          <span className="text-green-600 dark:text-green-400">{cards.length - currentIndex - 1}</span>
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
              onClick={() => setShowAnswer(true)}
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

      <div className="flex items-center justify-center gap-2 text-sm text-zinc-500 dark:text-zinc-500">
        <span>復習回数: {currentCard.reps}</span>
        <span>•</span>
        <span>難易度: {currentCard.difficulty.toFixed(1)}</span>
      </div>
    </div>
  );
}
