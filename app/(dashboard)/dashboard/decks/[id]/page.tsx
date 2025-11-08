"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Deck {
  id: string;
  name: string;
  description: string | null;
}

interface Card {
  id: string;
  front: string;
  back: string;
  reps: number;
  due: number;
}

export default function DeckDetailPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.id as string;

  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [newCard, setNewCard] = useState({ front: "", back: "" });

  useEffect(() => {
    fetchDeck();
    fetchCards();
  }, [deckId]);

  const fetchDeck = () => {
    fetch(`/api/decks/${deckId}`)
      .then((res) => res.json())
      .then((data) => setDeck(data))
      .catch((error) => console.error("Failed to fetch deck:", error));
  };

  const fetchCards = () => {
    fetch(`/api/decks/${deckId}/cards`)
      .then((res) => res.json())
      .then((data) => {
        setCards(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to fetch cards:", error);
        setLoading(false);
      });
  };

  const createCard = async () => {
    if (!newCard.front.trim() || !newCard.back.trim()) return;

    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deck_id: deckId,
          front: newCard.front,
          back: newCard.back,
        }),
      });

      if (res.ok) {
        setNewCard({ front: "", back: "" });
        setShowNewCardForm(false);
        fetchCards();
      }
    } catch (error) {
      console.error("Failed to create card:", error);
    }
  };

  const deleteCard = async (cardId: string) => {
    if (!confirm("このカードを削除してもよろしいですか?")) return;

    try {
      const res = await fetch(`/api/cards/${cardId}`, { method: "DELETE" });
      if (res.ok) {
        fetchCards();
      }
    } catch (error) {
      console.error("Failed to delete card:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-zinc-600 dark:text-zinc-400">読み込み中...</div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="text-center py-12">
        <div className="text-zinc-600 dark:text-zinc-400">デッキが見つかりません</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard/decks"
          className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 mb-4 inline-block"
        >
          ← デッキ一覧に戻る
        </Link>
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
            <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-2">
              {cards.length} カード
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href={`/dashboard/study?deck=${deckId}`}
              className="px-6 py-3 bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 rounded-xl font-medium hover:scale-105 transition-transform"
            >
              学習開始
            </Link>
            <button
              onClick={() => setShowNewCardForm(!showNewCardForm)}
              className="px-6 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              ➕ カード追加
            </button>
          </div>
        </div>
      </div>

      {showNewCardForm && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            新しいカードを作成
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                表 (質問)
              </label>
              <textarea
                value={newCard.front}
                onChange={(e) => setNewCard({ ...newCard, front: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 outline-none"
                rows={3}
                placeholder="質問を入力"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                裏 (答え)
              </label>
              <textarea
                value={newCard.back}
                onChange={(e) => setNewCard({ ...newCard, back: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 outline-none"
                rows={3}
                placeholder="答えを入力"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={createCard}
                className="px-6 py-2 bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 rounded-lg font-medium hover:scale-105 transition-transform"
              >
                作成
              </button>
              <button
                onClick={() => setShowNewCardForm(false)}
                className="px-6 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {cards.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-12 text-center shadow-sm border border-zinc-200 dark:border-zinc-800">
          <div className="text-6xl mb-4">🃏</div>
          <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            カードがありません
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            最初のカードを作成しましょう
          </p>
          <button
            onClick={() => setShowNewCardForm(true)}
            className="px-6 py-3 bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 rounded-xl font-medium hover:scale-105 transition-transform"
          >
            カードを作成
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {cards.map((card) => (
            <div
              key={card.id}
              className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-800"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-500 mb-1">表</div>
                    <div className="text-zinc-900 dark:text-zinc-100">{card.front}</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-500 mb-1">裏</div>
                    <div className="text-zinc-600 dark:text-zinc-400">{card.back}</div>
                  </div>
                  <div className="flex gap-4 text-xs text-zinc-500 dark:text-zinc-500">
                    <span>復習回数: {card.reps}</span>
                    <span>•</span>
                    <span>
                      次回: {new Date(card.due).toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => deleteCard(card.id)}
                  className="text-red-500 hover:text-red-600 text-sm ml-4"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
