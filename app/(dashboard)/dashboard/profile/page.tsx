"use client";

import { useSession } from "@/lib/auth-client";
import { useState, useEffect } from "react";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const [name, setName] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.name) {
      setName(session.user.name);
    }
  }, [session?.user?.name]);

  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      setError("表示名を入力してください。");
      return;
    }
    if (name === session?.user?.name) {
      // 名前が変更されていない場合は何もしない
      return;
    }

    setIsUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "プロフィールの更新に失敗しました。");
      }

      setSuccess("プロフィールが正常に更新されました。");
      // ページをリロードしてセッション情報を最新にする
      // より高度な実装としては、useSessionのupdate関数を使う
      window.location.reload();

    } catch (err) {
      setError(err instanceof Error ? err.message : "予期せぬエラーが発生しました。");
    } finally {
      setIsUpdating(false);
    }
  };

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
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            placeholder="表示名"
            disabled={isUpdating}
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

        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-500">{success}</p>}

        <div className="flex justify-end">
          <button
            onClick={handleUpdateProfile}
            className="px-6 py-2 bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 rounded-lg font-medium hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isUpdating || name === session.user.name || !name.trim()}
          >
            {isUpdating ? "更新中..." : "更新"}
          </button>
        </div>
      </div>
    </div>
  );
}