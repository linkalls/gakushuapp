"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client"; // Assuming you have a client-side auth hook

interface RankingUser {
  userId: string;
  userName: string;
  userImage: string | null;
  reviewCount: number;
}

export default function RankingPage() {
  const [ranking, setRanking] = useState<RankingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { session } = useSession(); // Get current user's session

  useEffect(() => {
    fetchRanking();
  }, []);

  const fetchRanking = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ranking/weekly-reviews");
      if (!res.ok) {
        throw new Error("Failed to fetch ranking data.");
      }
      const data = await res.json();
      setRanking(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRankSuffix = (rank: number) => {
    if (rank === 1) return "st";
    if (rank === 2) return "nd";
    if (rank === 3) return "rd";
    return "th";
  };

  const getMedal = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-zinc-600 dark:text-zinc-400">ランキングを読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500">エラー: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          週間レビューランキング
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-2">
          過去7日間のレビュー数に基づいたトップ20ユーザー
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {ranking.map((user, index) => {
            const rank = index + 1;
            const isCurrentUser = session?.user?.id === user.userId;

            return (
              <li
                key={user.userId}
                className={`flex items-center p-4 ${isCurrentUser ? "bg-blue-50 dark:bg-blue-900/30" : ""}`}
              >
                <div className="flex items-center gap-4 w-1/3">
                  <span className="text-lg font-bold text-zinc-500 dark:text-zinc-400 w-10 text-center">
                    {getMedal(rank) || (
                      <>
                        {rank}
                        <sup className="text-xs">{getRankSuffix(rank)}</sup>
                      </>
                    )}
                  </span>
                  <img
                    src={user.userImage || `https://avatar.vercel.sh/${user.userId}.svg`}
                    alt={user.userName}
                    className="w-10 h-10 rounded-full"
                  />
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {user.userName}
                  </span>
                </div>
                <div className="flex-1 text-right">
                  <span className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
                    {user.reviewCount.toLocaleString()}
                  </span>
                  <span className="text-sm text-zinc-500 dark:text-zinc-500 ml-1">
                    reviews
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
        {ranking.length === 0 && (
           <div className="p-12 text-center">
             <p className="text-zinc-600 dark:text-zinc-400">
               まだ誰もレビューをしていません。最初のレビュアーになろう！
             </p>
           </div>
        )}
      </div>
    </div>
  );
}
