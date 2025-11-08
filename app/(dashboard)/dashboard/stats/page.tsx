"use client";

import { useEffect, useState } from "react";

interface DetailedStats {
  dailyReviews: Array<{ date: string; count: number }>;
  cardStates: Array<{ state: number; count: number }>;
  retention: string;
}

export default function StatsPage() {
  const [stats, setStats] = useState<DetailedStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats/detailed")
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to fetch stats:", error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-zinc-600 dark:text-zinc-400">読み込み中...</div>
      </div>
    );
  }

  const stateLabels: Record<number, string> = {
    0: "新規",
    1: "学習中",
    2: "復習中",
    3: "再学習中",
  };

  const maxReviews = Math.max(
    ...stats!.dailyReviews.map((d) => d.count),
    1
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          統計
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-2">
          学習の進捗を確認しましょう
        </p>
      </div>

      {/* Retention Rate */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-sm border border-zinc-200 dark:border-zinc-800">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-6">
          過去30日間の保持率
        </h2>
        <div className="text-center">
          <div className="text-6xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            {stats?.retention}%
          </div>
          <p className="text-zinc-600 dark:text-zinc-400">
            正解率（Hard以上）
          </p>
        </div>
      </div>

      {/* Daily Reviews Chart */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-sm border border-zinc-200 dark:border-zinc-800">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-6">
          過去30日間の復習数
        </h2>
        {stats && stats.dailyReviews.length > 0 ? (
          <div className="space-y-2">
            {stats.dailyReviews.map((day) => (
              <div key={day.date} className="flex items-center gap-4">
                <div className="w-24 text-sm text-zinc-600 dark:text-zinc-400 font-mono">
                  {day.date}
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <div
                    className="bg-zinc-900 dark:bg-zinc-100 h-8 rounded transition-all"
                    style={{
                      width: `${(day.count / maxReviews) * 100}%`,
                      minWidth: day.count > 0 ? "2rem" : "0",
                    }}
                  />
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {day.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-zinc-500 dark:text-zinc-500">
            まだ復習データがありません
          </div>
        )}
      </div>

      {/* Card States Distribution */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-sm border border-zinc-200 dark:border-zinc-800">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-6">
          カードの状態
        </h2>
        {stats && stats.cardStates.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.cardStates.map((state) => (
              <div
                key={state.state}
                className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-6 text-center"
              >
                <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                  {state.count}
                </div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  {stateLabels[state.state] || "不明"}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-zinc-500 dark:text-zinc-500">
            まだカードがありません
          </div>
        )}
      </div>
    </div>
  );
}
