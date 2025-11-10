"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface Deck {
  id: string;
  name: string;
  description: string | null;
  deck_path: string;
  owner: {
    name: string;
    image: string | null;
  };
}

interface Card {
  id: string;
  front: string;
  back: string;
}

interface PaginatedResponse {
  cards: Card[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function SharedDeckPage() {
  const params = useParams();
  const shareId = params.shareId as string;

  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shareId) return;
    fetchDeckAndCards();
  }, [shareId, pagination.page]);

  const fetchDeckAndCards = async () => {
    setLoading(true);
    try {
      // Fetch deck details
      const deckRes = await fetch(`/api/decks/shared/${shareId}`);
      if (!deckRes.ok) {
        throw new Error("Deck not found or not public.");
      }
      const deckData = await deckRes.json();
      setDeck(deckData);

      // Fetch cards for the deck
      const cardsParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        includeChildren: "true",
      });
      const cardsRes = await fetch(`/api/decks/${deckData.id}/cards?${cardsParams}`);
      if (!cardsRes.ok) {
        throw new Error("Failed to fetch cards.");
      }
      const cardsData: PaginatedResponse = await cardsRes.json();
      setCards(cardsData.cards);
      setPagination(cardsData.pagination);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="text-zinc-600 dark:text-zinc-400">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950 text-center">
        <h1 className="text-2xl font-bold text-red-500 mb-4">エラー</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-8">{error}</p>
        <Link href="/" className="text-blue-500 hover:underline">
          ホームに戻る
        </Link>
      </div>
    );
  }

  if (!deck) {
    return null; // Should be handled by error state
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="py-4 px-8 border-b border-zinc-200 dark:border-zinc-800 flex justify-end">
        <div className="flex gap-4">
          <Link href="/login" className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
            ログイン
          </Link>
          <Link href="/signup" className="text-sm font-medium bg-zinc-900 text-white px-4 py-2 rounded-lg hover:bg-zinc-800">
            サインアップ
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-8">
        <div className="space-y-8">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                  {deck.name}
                </h1>
                {deck.description && (
                  <p className="text-zinc-600 dark:text-zinc-400 mt-2">
                    {deck.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-3">
                  {deck.owner.image && (
                    <img src={deck.owner.image} alt={deck.owner.name} className="w-6 h-6 rounded-full" />
                  )}
                  <span className="text-sm text-zinc-500 dark:text-zinc-500">
                    作成者: {deck.owner.name}
                  </span>
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-2">
                  {pagination.total} カード
                </p>
              </div>
              <button
                // TODO: Implement copy/import functionality
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-transform"
              >
                デッキをコピー
              </button>
            </div>
          </div>

          {cards.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-12 text-center shadow-sm border border-zinc-200 dark:border-zinc-800">
              <div className="text-6xl mb-4">🃏</div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                このデッキにはカードがありません
              </h3>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {cards.map((card) => (
                  <div
                    key={card.id}
                    className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-800"
                  >
                    <div className="flex-1 space-y-3">
                      <div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-500 mb-1">表</div>
                        <div className="text-zinc-900 dark:text-zinc-100">{card.front}</div>
                      </div>
                      <div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-500 mb-1">裏</div>
                        <div className="text-zinc-600 dark:text-zinc-400">{card.back}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    disabled={pagination.page === 1}
                    className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    前へ
                  </button>
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    次へ
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
