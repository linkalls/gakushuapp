"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, X } from "lucide-react";
import Link from "next/link";

type SearchResult = {
  id: string;
  deck_id: string;
  deck_name: string;
  front: string;
  back: string;
  state: number;
  reps: number;
  updated_at: number;
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const performSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.cards || []);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      performSearch();
    }
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setSearched(false);
  };

  const getStateLabel = (state: number) => {
    switch (state) {
      case 0:
        return "新規";
      case 1:
        return "学習中";
      case 2:
        return "復習中";
      case 3:
        return "再学習中";
      default:
        return "不明";
    }
  };

  const getStateColor = (state: number) => {
    switch (state) {
      case 0:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case 1:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case 2:
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case 3:
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Search className="w-8 h-8" />
          カード検索
        </h1>
        <p className="text-muted-foreground">
          カードの表面または裏面を検索します
        </p>
      </div>

      {/* 検索フォーム */}
      <Card className="p-6 mb-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="検索キーワードを入力..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10 pr-10"
            />
            {query && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
          <Button onClick={performSearch} disabled={!query.trim() || loading}>
            {loading ? "検索中..." : "検索"}
          </Button>
        </div>
      </Card>

      {/* 検索結果 */}
      {searched && (
        <div>
          <div className="mb-4 text-sm text-muted-foreground">
            {results.length > 0
              ? `${results.length}件のカードが見つかりました`
              : "検索結果はありません"}
          </div>

          <div className="space-y-3">
            {results.map((card) => (
              <Card key={card.id} className="p-4 hover:shadow-md transition-shadow">
                <Link href={`/dashboard/decks/${card.deck_id}/cards`}>
                  <div className="space-y-3">
                    {/* デッキ名とステータス */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        📚 {card.deck_name}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStateColor(
                          card.state
                        )}`}
                      >
                        {getStateLabel(card.state)}
                      </span>
                    </div>

                    {/* カード内容 */}
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">
                          表面
                        </div>
                        <div
                          className="text-sm"
                          dangerouslySetInnerHTML={{ __html: card.front }}
                        />
                      </div>
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">
                          裏面
                        </div>
                        <div
                          className="text-sm text-muted-foreground"
                          dangerouslySetInnerHTML={{ __html: card.back }}
                        />
                      </div>
                    </div>

                    {/* 統計情報 */}
                    <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
                      <span>復習回数: {card.reps}回</span>
                      <span>
                        最終更新:{" "}
                        {new Date(card.updated_at).toLocaleDateString("ja-JP")}
                      </span>
                    </div>
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 初回表示 */}
      {!searched && (
        <Card className="p-8 text-center text-muted-foreground">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>検索キーワードを入力して検索してください</p>
          <p className="text-sm mt-2">
            カードの表面または裏面のテキストを検索できます
          </p>
        </Card>
      )}
    </div>
  );
}
