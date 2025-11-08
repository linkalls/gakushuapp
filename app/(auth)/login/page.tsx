"use client";

import { isAuthenticated, login } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated()) {
      router.push("/dashboard");
    }
  }, [router]);

  const handleLogin = () => {
    login();
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-black">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-8 border border-zinc-200 dark:border-zinc-800">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
              Gakushu
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              ログインして学習を開始
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleLogin}
              className="w-full py-3 px-4 bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 rounded-xl font-medium hover:scale-[1.02] transition-transform shadow-sm"
            >
              デモユーザーでログイン
            </button>

            <div className="text-center text-sm text-zinc-500 dark:text-zinc-500">
              <p>デモモードでは誰でもログインできます</p>
              <p className="mt-1">本格的な認証機能は近日追加予定</p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800">
            <div className="text-xs text-zinc-500 dark:text-zinc-500 space-y-1">
              <p>✨ FSRS アルゴリズム搭載</p>
              <p>📊 詳細な学習統計</p>
              <p>🌓 ダークモード対応</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
