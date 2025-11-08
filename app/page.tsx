import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-black">
      <main className="flex flex-col items-center justify-center gap-8 px-4 py-16">
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-6xl font-bold bg-linear-to-r from-zinc-900 to-zinc-600 dark:from-zinc-100 dark:to-zinc-400 bg-clip-text text-transparent">
            Gakushu
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-md">
            モダンで美しい間隔反復学習アプリ
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-500 max-w-lg">
            科学的なFSRSアルゴリズムを使用した、Ankiの代替となる学習体験
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <Link
            href="/login"
            className="flex h-12 items-center justify-center rounded-full bg-zinc-900 dark:bg-zinc-100 px-8 text-zinc-50 dark:text-zinc-900 font-medium transition-all hover:scale-105 hover:shadow-lg"
          >
            学習を開始
          </Link>
          <Link
            href="/login"
            className="flex h-12 items-center justify-center rounded-full border-2 border-zinc-900 dark:border-zinc-100 px-8 text-zinc-900 dark:text-zinc-100 font-medium transition-all hover:bg-zinc-900 hover:text-zinc-50 dark:hover:bg-zinc-100 dark:hover:text-zinc-900"
          >
            デモを見る
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-4xl">
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
    </div>
  );
}
