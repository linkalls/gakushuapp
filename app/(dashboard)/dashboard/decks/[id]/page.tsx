"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Deck {
  id: string;
  name: string;
  description: string | null;
  deck_path: string;
  parent_id: string | null;
  isPublic: boolean;
  shareId: string | null;
}

interface Card {
  id: string;
  front: string;
  back: string;
  reps: number;
  due: number;
}

interface Tag {
  id: string;
  name: string;
  user_id: string;
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

export default function DeckDetailPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.id as string;

  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [newCard, setNewCard] = useState({ front: "", back: "", tags: [] as string[] });
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [showShareUrl, setShowShareUrl] = useState(false);

  useEffect(() => {
    fetchDeck();
    fetchTags();
  }, [deckId]);

  useEffect(() => {
    fetchCards();
  }, [deckId, pagination.page]);

  const fetchDeck = () => {
    fetch(`/api/decks/${deckId}`)
      .then((res) => res.json())
      .then((data) => {
        setDeck(data);
        if (data.isPublic) {
          setShowShareUrl(true);
        }
      })
      .catch((error) => console.error("Failed to fetch deck:", error));
  };

  const fetchTags = async () => {
    try {
      const res = await fetch("/api/tags");
      const data = await res.json();
      setAvailableTags(data);
    } catch (error) {
      console.error("Failed to fetch tags:", error);
    }
  };

  const fetchCards = () => {
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      limit: pagination.limit.toString(),
      includeChildren: "true", // 常に子デッキも含める
    });

    fetch(`/api/decks/${deckId}/cards?${params}`)
      .then((res) => res.json())
      .then((data: PaginatedResponse) => {
        setCards(data.cards);
        setPagination(data.pagination);
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
          deckId: deckId,
          front: newCard.front,
          back: newCard.back,
        }),
      });

      if (res.ok) {
        const createdCard = await res.json();

        // タグを追加
        for (const tagId of newCard.tags) {
          await fetch(`/api/cards/${createdCard.id}/tags`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tag_id: tagId }),
          });
        }

        setNewCard({ front: "", back: "", tags: [] });
        setShowNewCardForm(false);
        fetchCards();
      }
    } catch (error) {
      console.error("Failed to create card:", error);
    }
  };

  const toggleTag = (tagId: string) => {
    setNewCard((prev) => ({
      ...prev,
      tags: prev.tags.includes(tagId)
        ? prev.tags.filter((id) => id !== tagId)
        : [...prev.tags, tagId],
    }));
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

  const handleShare = async () => {
    try {
      const res = await fetch(`/api/decks/${deckId}/share`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: true }),
      });
      if (res.ok) {
        const updatedDeck = await res.json();
        setDeck(updatedDeck);
        setShowShareUrl(true);
      }
    } catch (error) {
      console.error("Failed to share deck:", error);
    }
  };

  const handleUnshare = async () => {
    try {
      const res = await fetch(`/api/decks/${deckId}/share`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: false }),
      });
      if (res.ok) {
        const updatedDeck = await res.json();
        setDeck(updatedDeck);
        setShowShareUrl(false);
      }
    } catch (error) {
      console.error("Failed to unshare deck:", error);
    }
  };

  const handleExport = () => {
    window.location.href = `/api/decks/${deckId}/export`;
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

  const shareUrl = deck.shareId ? `${window.location.origin}/decks/shared/${deck.shareId}` : "";

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
            <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
              {deck.deck_path}
            </p>
            {deck.description && (
              <p className="text-zinc-600 dark:text-zinc-400 mt-2">
                {deck.description}
              </p>
            )}
            <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-2">
              {pagination.total} カード（サブデッキ含む）
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
            <button
              onClick={handleExport}
              className="px-6 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              エクスポート
            </button>
            {!deck.isPublic ? (
              <button
                onClick={handleShare}
                className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
              >
                共有
              </button>
            ) : (
              <button
                onClick={handleUnshare}
                className="px-6 py-3 bg-gray-500 text-white rounded-xl font-medium hover:bg-gray-600 transition-colors"
              >
                共有停止
              </button>
            )}
          </div>
        </div>
        {showShareUrl && deck.isPublic && (
          <div className="mt-4 bg-zinc-100 dark:bg-zinc-800 p-4 rounded-lg">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              共有リンク
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
              />
              <button
                onClick={() => navigator.clipboard.writeText(shareUrl)}
                className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 rounded-lg font-medium"
              >
                コピー
              </button>
            </div>
          </div>
        )}
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

            {availableTags.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  タグ (オプション)
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${newCard.tags.includes(tag.id)
                        ? "bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={createCard}
                className="px-6 py-2 bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 rounded-lg font-medium hover:scale-105 transition-transform"
              >
                作成
              </button>
              <button
                onClick={() => {
                  setShowNewCardForm(false);
                  setNewCard({ front: "", back: "", tags: [] });
                }}
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
        <>
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
  );
}
