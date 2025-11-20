
// Server component: fetch ranking/server session directly
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import * as schema from "@/lib/db/drizzle-schema";
import { count, desc, eq, gte } from "drizzle-orm";
import { headers } from "next/headers";

interface RankingUser {
  userId: string;
  userName: string;
  userImage: string | null;
  reviewCount: number;
}

export default async function RankingPage() {
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const { users, reviews, cards, decks } = schema as any;

  const ranking = await db
    .select({
      userId: users.id,
      userName: users.name,
      userImage: users.image,
      reviewCount: count(reviews.id),
    })
    .from(reviews)
    .innerJoin(cards, eq(reviews.cardId, cards.id))
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .innerJoin(users, eq(decks.userId, users.id))
    .where(gte(reviews.reviewTime, oneWeekAgo))
    .groupBy(users.id, users.name, users.image)
    .orderBy(desc(count(reviews.id)))
    .limit(20)
    .all();

  const session = await auth.api.getSession({
    headers: await headers()
  });
  const currentUserId = session?.user?.id ?? null;

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

  // Server-rendered; no client loading state required

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
            const isCurrentUser = currentUserId === user.userId;

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
