"use client";

import { useSession } from "@/lib/auth-client";

export default function ProfilePage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-zinc-600 dark:text-zinc-400">読み込み中...</div>
      </div>
    );
  }

  if (status === "unauthenticated" || !session?.user) {
    return (
      <div className="text-center py-12">
        <div className="text-zinc-600 dark:text-zinc-400">
          ログインしてください
        </div>
      </div>
    );
  }

  const { user } = session;

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          プロフィール
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-2">
          アカウント情報を管理します
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-8 space-y-6">
        <div className="flex items-center gap-6">
          <img
            src={user.image || `https://avatar.vercel.sh/${user.id}.svg`}
            alt={user.name || "User avatar"}
            className="w-24 h-24 rounded-full"
          />
          <div>
            <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-200">
              {user.name}
            </h2>
            <p className="text-zinc-500 dark:text-zinc-500">{user.email}</p>
          </div>
        </div>

        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
          >
            表示名
          </label>
          <input
            type="text"
            id="name"
            defaultValue={user.name || ""}
            className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            placeholder="表示名"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
          >
            メールアドレス
          </label>
          <input
            type="email"
            id="email"
            defaultValue={user.email || ""}
            disabled
            className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
          />
        </div>

        <div className="flex justify-end">
          <button
            // onClick={handleUpdateProfile}
            className="px-6 py-2 bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 rounded-lg font-medium hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            disabled // 機能は未実装のため無効化
          >
            更新
          </button>
        </div>
         <div className="text-center text-sm text-zinc-500 dark:text-zinc-500 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <p>プロフィールの更新機能は現在準備中です。</p>
         </div>
      </div>
    </div>
  );
}
