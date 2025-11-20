"use client";

import { signIn } from "@/lib/auth-client";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("HomePage");

  const handleDemoLogin = async () => {
    setIsDemoLoading(true);
    setError(null);
    try {
      const result = await signIn.anonymous();

      if (result?.error) {
        setError("匿名でのログインに失敗しました。");
        setIsDemoLoading(false);
      } else {
        // signIn should handle the redirect on success
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Anonymous login request failed:", error);
      setError("予期せぬエラーが発生しました。");
      setIsDemoLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-linear-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-black">
      <main className="flex flex-col items-center justify-center gap-8 px-4 py-16">
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-6xl font-bold bg-linear-to-r from-zinc-900 to-zinc-600 dark:from-zinc-100 dark:to-zinc-400 bg-clip-text text-transparent">
             Gakushukun
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-md">
            {/* Modern and beautiful spaced repetition app */}
             モダンで美しい間隔反復学習アプリ
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-500 max-w-lg">
            {/* Scientific FSRS algorithm, alternative to Anki */}
             科学的なFSRSアルゴリズムを使用した、Ankiの代替となる学習体験
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative max-w-md text-center">
            <strong className="font-bold">エラー: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <Link
            href="/signup"
            className="flex h-12 items-center justify-center rounded-full bg-zinc-900 dark:bg-zinc-100 px-8 text-zinc-50 dark:text-zinc-900 font-medium transition-all hover:scale-105 hover:shadow-lg"
          >
             無料で学習を開始
          </Link>
          <button
            onClick={handleDemoLogin}
            disabled={isDemoLoading}
            className="flex h-12 w-full sm:w-auto items-center justify-center rounded-full border-2 border-zinc-900 dark:border-zinc-100 px-8 text-zinc-900 dark:text-zinc-100 font-medium transition-all hover:bg-zinc-900 hover:text-zinc-50 dark:hover:bg-zinc-100 dark:hover:text-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDemoLoading ? "ログイン中..." : "今すぐ試してみる"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-4xl">
          <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm">
            <div className="text-4xl">🎯</div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">FSRS Algorithm</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center">
              最新の科学的な間隔反復アルゴリズム
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm">
            <div className="text-4xl">✨</div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Beautiful UI</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center">
              モダンで直感的なデザイン
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm">
            <div className="text-4xl">🔄</div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Anki Compatible</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center">
              .apkgファイルのインポートに対応
            </p>
          </div>
        </div>
      </main>
      <footer className="w-full text-center py-8 px-4">
        <div className="text-sm text-zinc-500 dark:text-zinc-400">
          <Link href="/terms" className="hover:underline">
            利用規約
          </Link>
          <span className="mx-2">·</span>
          <Link href="/privacy" className="hover:underline">
            プライバシーポリシー
          </Link>
        </div>
      </footer>
    </div>
  );
}
