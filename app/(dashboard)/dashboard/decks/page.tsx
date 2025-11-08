"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Deck {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  created_at: number;
  updated_at: number;
}

export default function DecksPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDeckForm, setShowNewDeckForm] = useState(false);
  const [newDeck, setNewDeck] = useState({ name: "", description: "" });

  useEffect(() => {
    fetchDecks();
  }, []);

  const fetchDecks = () => {
    fetch("/api/decks")
      .then((res) => res.json())
      .then((data) => {
        setDecks(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to fetch decks:", error);
        setLoading(false);
      });
  };

  const createDeck = async () => {
    if (!newDeck.name.trim()) return;

    try {
      const res = await fetch("/api/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDeck),
      });

      if (res.ok) {
        setNewDeck({ name: "", description: "" });
        setShowNewDeckForm(false);
        fetchDecks();
      }
    } catch (error) {
      console.error("Failed to create deck:", error);
    }
  };

  const deleteDeck = async (id: string) => {
    if (!confirm("このデッキを削除してもよろしいですか?")) return;

    try {
      const res = await fetch(`/api/decks/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchDecks();
      }
    } catch (error) {
      console.error("Failed to delete deck:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-zinc-600 dark:text-zinc-400">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            デッキ
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            学習デッキを管理しましょう
          </p>
        </div>
        <button
          onClick={() => setShowNewDeckForm(!showNewDeckForm)}
          className="px-6 py-3 bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 rounded-xl font-medium hover:scale-105 transition-transform"
        >
          ➕ 新しいデッキ
        </button>
      </div>

      {showNewDeckForm && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            新しいデッキを作成
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                デッキ名
              </label>
              <input
                type="text"
                value={newDeck.name}
                onChange={(e) => setNewDeck({ ...newDeck, name: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 outline-none"
                placeholder="例: 英単語"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                説明 (オプション)
              </label>
              <textarea
                value={newDeck.description}
                onChange={(e) => setNewDeck({ ...newDeck, description: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 outline-none"
                rows={3}
                placeholder="デッキの説明を入力"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={createDeck}
                className="px-6 py-2 bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 rounded-lg font-medium hover:scale-105 transition-transform"
              >
                作成
              </button>
              <button
                onClick={() => setShowNewDeckForm(false)}
                className="px-6 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {decks.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-12 text-center shadow-sm border border-zinc-200 dark:border-zinc-800">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            デッキがありません
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            最初のデッキを作成して学習を始めましょう
          </p>
          <button
            onClick={() => setShowNewDeckForm(true)}
            className="px-6 py-3 bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 rounded-xl font-medium hover:scale-105 transition-transform"
          >
            デッキを作成
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {decks.map((deck) => (
            <div
              key={deck.id}
              className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-800 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {deck.name}
                </h3>
                <button
                  onClick={() => deleteDeck(deck.id)}
                  className="text-red-500 hover:text-red-600 text-sm"
                >
                  削除
                </button>
              </div>
              {deck.description && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                  {deck.description}
                </p>
              )}
              <div className="flex gap-2 mt-4">
                <Link
                  href={`/dashboard/decks/${deck.id}`}
                  className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg text-center font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-sm"
                >
                  カードを見る
                </Link>
                <Link
                  href={`/dashboard/study?deck=${deck.id}`}
                  className="flex-1 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 rounded-lg text-center font-medium hover:scale-105 transition-transform text-sm"
                >
                  学習開始
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
