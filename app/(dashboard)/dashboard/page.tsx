import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Link from "next/link";

import { db } from "@/lib/db/drizzle";
import * as schema from "@/lib/db/drizzle-schema";
import { count, eq, gte, lte } from "drizzle-orm";

interface Stats {
  totalDecks: number;
  totalCards: number;
  dueCards: number;
  reviewsToday: number;
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) {
    // If no session, render a simple message (AuthGuard normally protects this)
    return (
      <div className="text-center py-12">
        <div className="text-zinc-600 dark:text-zinc-400">ログインしてください</div>
      </div>
    );
  }

  const userId = session.user.id;

  const { decks, cards, reviews } = schema as any;

  const totalDecksRes = await db
    .select({ count: count() })
    .from(decks)
    .where(eq(decks.userId, userId))
    .get();

  const totalDecks = Number(totalDecksRes?.count || 0);

  const totalCardsRes = await db
    .select({ count: count() })
    .from(cards)
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .where(eq(decks.userId, userId))
    .get();

  const totalCards = Number(totalCardsRes?.count || 0);

  const now = Date.now();
  const dueCardsRes = await db
    .select({ count: count() })
    .from(cards)
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .where(eq(decks.userId, userId))
    .where(lte(cards.due, now))
    .get();

  const dueCards = Number(dueCardsRes?.count || 0);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const reviewsTodayRes = await db
    .select({ count: count() })
    .from(reviews)
    .innerJoin(cards, eq(reviews.cardId, cards.id))
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .where(eq(decks.userId, userId))
    .where(gte(reviews.reviewTime, todayStart.getTime()))
    .get();

  const reviewsToday = Number(reviewsTodayRes?.count || 0);

  const stats: Stats = {
    totalDecks,
    totalCards,
    dueCards,
    reviewsToday,
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          ダッシュボード
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-2">
          学習の進捗を確認しましょう
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                デッキ数
              </p>
              <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
                {stats?.totalDecks || 0}
              </p>
            </div>
            <div className="text-4xl">📚</div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                総カード数
              </p>
              <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
                {stats?.totalCards || 0}
              </p>
            </div>
            <div className="text-4xl">🃏</div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                復習予定
              </p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                {stats?.dueCards || 0}
              </p>
            </div>
            <div className="text-4xl">⏰</div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                今日の復習
              </p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                {stats?.reviewsToday || 0}
              </p>
            </div>
            <div className="text-4xl">✅</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-sm border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            クイックアクション
          </h2>
          <div className="space-y-3">
            <Link
              href="/dashboard/decks"
              className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">📖</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  学習を開始
                </span>
              </div>
              <span className="text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300">
                →
              </span>
            </Link>
            <Link
              href="/dashboard/decks"
              className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">➕</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  新しいデッキ作成
                </span>
              </div>
              <span className="text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300">
                →
              </span>
            </Link>
            <Link
              href="/dashboard/import"
              className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">📦</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  Ankiデータをインポート
                </span>
              </div>
              <span className="text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300">
                →
              </span>
            </Link>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-sm border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            最近のアクティビティ
          </h2>
          <div className="text-center py-12 text-zinc-500 dark:text-zinc-500">
            アクティビティがまだありません
          </div>
        </div>
      </div>
    </div>
  );
}
