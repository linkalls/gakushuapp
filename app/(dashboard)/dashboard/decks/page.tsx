"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Deck {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  parent_id: string | null;
  deck_path: string;
  created_at: number;
  updated_at: number;
}

interface DeckStats {
  totalCards: number;
  newCards: number;
  learningCards: number;
  dueCards: number;
  progress: number;
}

interface DeckWithStats extends Deck {
  stats?: DeckStats;
  children?: DeckWithStats[];
  level: number;
}

export default function DecksPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [deckStats, setDeckStats] = useState<Map<string, DeckStats>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showNewDeckForm, setShowNewDeckForm] = useState(false);
  const [newDeck, setNewDeck] = useState({ name: "", description: "", parent_id: "" });
  const [expandedDecks, setExpandedDecks] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchDecks();
  }, []);

  const fetchDecks = async () => {
    try {
      // 一度のAPIコールでstatsも含めて取得
      const res = await fetch("/api/decks?includeStats=true");
      const data = await res.json();
      setDecks(data);

      // statsを個別に抽出
      const statsMap = new Map<string, DeckStats>();
      data.forEach((deck: any) => {
        if (deck.stats) {
          statsMap.set(deck.id, deck.stats);
        }
      });
      setDeckStats(statsMap);

      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch decks:", error);
      setLoading(false);
    }
  };

  const fetchDeckStats = async (deckId: string) => {
    // サブデッキボタン押下時のみ呼び出し
    try {
      const res = await fetch(`/api/decks/${deckId}/stats`);
      const stats = await res.json();
      setDeckStats((prev) => new Map(prev).set(deckId, stats));
    } catch (error) {
      console.error(`Failed to fetch stats for deck ${deckId}:`, error);
    }
  };

  const buildDeckTree = (decks: Deck[]): DeckWithStats[] => {
    const deckMap = new Map<string, DeckWithStats>();
    const rootDecks: DeckWithStats[] = [];

    // Create deck objects with level
    decks.forEach((deck) => {
      const level = deck.deck_path.split("::").length - 1;
      deckMap.set(deck.id, {
        ...deck,
        stats: deckStats.get(deck.id),
        children: [],
        level,
      });
    });

    // Build tree structure
    decks.forEach((deck) => {
      const deckWithStats = deckMap.get(deck.id)!;
      if (deck.parent_id) {
        const parent = deckMap.get(deck.parent_id);
        if (parent) {
          parent.children!.push(deckWithStats);
        } else {
          rootDecks.push(deckWithStats);
        }
      } else {
        rootDecks.push(deckWithStats);
      }
    });

    // Sort by name
    const sortDecks = (decks: DeckWithStats[]) => {
      decks.sort((a, b) => a.name.localeCompare(b.name));
      decks.forEach((deck) => {
        if (deck.children && deck.children.length > 0) {
          sortDecks(deck.children);
        }
      });
    };

    sortDecks(rootDecks);
    return rootDecks;
  };

  const createDeck = async () => {
    if (!newDeck.name.trim()) return;

    try {
      const res = await fetch("/api/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newDeck.name,
          description: newDeck.description || null,
          parent_id: newDeck.parent_id || null,
        }),
      });

      if (res.ok) {
        setNewDeck({ name: "", description: "", parent_id: "" });
        setShowNewDeckForm(false);
        fetchDecks();
      }
    } catch (error) {
      console.error("Failed to create deck:", error);
    }
  };

  const deleteDeck = async (id: string) => {
    if (!confirm("このデッキと全てのサブデッキ・カードを削除してもよろしいですか?")) return;

    try {
      const res = await fetch(`/api/decks/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchDecks();
      }
    } catch (error) {
      console.error("Failed to delete deck:", error);
    }
  };

  const toggleExpand = (deckId: string) => {
    setExpandedDecks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(deckId)) {
        newSet.delete(deckId);
      } else {
        newSet.add(deckId);
      }
      return newSet;
    });
  };

  const renderDeck = (deck: DeckWithStats) => {
    const hasChildren = deck.children && deck.children.length > 0;
    const isExpanded = expandedDecks.has(deck.id);
    const stats = deck.stats;

    return (
      <div key={deck.id} className="mb-2">
        <div
          className="bg-white dark:bg-zinc-900 rounded-xl p-4 shadow-sm border border-zinc-200 dark:border-zinc-800 hover:shadow-md transition-shadow"
          style={{ marginLeft: `${deck.level * 24}px` }}
        >
          <div className="flex items-center gap-3">
            {hasChildren && (
              <button
                onClick={() => toggleExpand(deck.id)}
                className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                {isExpanded ? "▼" : "▶"}
              </button>
            )}
            {!hasChildren && <div className="w-6" />}

            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    {deck.name}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                    {deck.deck_path}
                  </p>
                </div>
                <button
                  onClick={() => deleteDeck(deck.id)}
                  className="text-red-500 hover:text-red-600 text-sm ml-4"
                >
                  削除
                </button>
              </div>

              {deck.description && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                  {deck.description}
                </p>
              )}

              {stats && (
                <div className="space-y-2">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">
                      全体: <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{stats.totalCards}</span>
                    </span>
                    <span className="text-blue-600 dark:text-blue-400">
                      新規: <span className="font-mono font-semibold">{stats.newCards}</span>
                    </span>
                    <span className="text-yellow-600 dark:text-yellow-400">
                      学習中: <span className="font-mono font-semibold">{stats.learningCards}</span>
                    </span>
                    <span className="text-red-600 dark:text-red-400">
                      復習: <span className="font-mono font-semibold">{stats.dueCards}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-linear-to-r from-blue-500 to-green-500"
                        style={{ width: `${stats.progress}%` }}
                      />
                    </div>
                    <span className="text-sm font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                      {stats.progress}%
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-3">
                <Link
                  href={`/dashboard/decks/${deck.id}`}
                  className="flex-1 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg text-center font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-sm"
                >
                  カードを見る
                </Link>
                <Link
                  href={`/dashboard/study?deck=${deck.id}`}
                  className="flex-1 px-3 py-2 bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 rounded-lg text-center font-medium hover:scale-105 transition-transform text-sm"
                >
                  学習開始
                </Link>
              </div>
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-2">
            {deck.children!.map((child) => renderDeck(child))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-zinc-600 dark:text-zinc-400">読み込み中...</div>
      </div>
    );
  }

  const deckTree = buildDeckTree(decks);

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
          onClick={() => {
            setShowNewDeckForm(!showNewDeckForm);
            setNewDeck({ name: "", description: "", parent_id: "" });
          }}
          className="px-6 py-3 bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 rounded-xl font-medium hover:scale-105 transition-transform"
        >
          ➕ 新しいデッキ
        </button>
      </div>

      {showNewDeckForm && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            {newDeck.parent_id ? "サブデッキを作成" : "新しいデッキを作成"}
          </h2>
          {newDeck.parent_id && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-200">
                親デッキ: {decks.find((d) => d.id === newDeck.parent_id)?.deck_path}
              </p>
            </div>
          )}
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
                placeholder="例: 02中世"
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
                onClick={() => {
                  setShowNewDeckForm(false);
                  setNewDeck({ name: "", description: "", parent_id: "" });
                }}
                className="px-6 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {deckTree.length === 0 ? (
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
        <div className="space-y-2">
          {deckTree.map((deck) => renderDeck(deck))}
        </div>
      )}
    </div>
  );
}
