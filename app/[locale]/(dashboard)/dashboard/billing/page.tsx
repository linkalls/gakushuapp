"use client";

import { useRouter } from "next/navigation";

export default function BillingPage() {
  const { push } = useRouter();

  // Since all functionality is disabled, we just show the "Under Construction" state
  const currentPlan = "free";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          課金情報
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-2">
          現在、有料プランの提供は準備中です。
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-8">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          現在のプラン
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-4xl font-bold text-zinc-800 dark:text-zinc-200">
              Free
            </p>
            <p className="text-zinc-500 dark:text-zinc-500 mt-1">
               基本的な学習機能を利用できます。
            </p>
          </div>
          <button
            disabled
            className="px-6 py-3 rounded-xl font-medium transition-colors bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed border-2 border-zinc-200 dark:border-zinc-800"
          >
            準備中
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Free Plan */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col">
          <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Free
          </h3>
          <p className="text-zinc-500 dark:text-zinc-500 mt-2">
            基本的な学習を始める方に
          </p>
          <p className="text-5xl font-extrabold text-zinc-900 dark:text-zinc-100 my-6">
            ¥0
            <span className="text-lg font-medium">/月</span>
          </p>
          <ul className="space-y-3 text-zinc-600 dark:text-zinc-400 flex-grow text-sm">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✔</span> AI生成: 月10回まで
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✔</span> テキスト入力: 5,000文字まで
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✔</span> PDF: 10MBまで
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✔</span> 基本的なFSRS学習
            </li>
          </ul>
          <button
            disabled
            className="w-full mt-6 px-6 py-3 rounded-xl font-medium bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
          >
            現在のプラン
          </button>
        </div>

        {/* Lite Plan */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col opacity-60">
          <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Lite
          </h3>
          <p className="text-zinc-500 dark:text-zinc-500 mt-2">
            準備中
          </p>
          <p className="text-5xl font-extrabold text-zinc-900 dark:text-zinc-100 my-6">
             -
            <span className="text-lg font-medium">/月</span>
          </p>
          <ul className="space-y-3 text-zinc-600 dark:text-zinc-400 flex-grow text-sm">
             {/* Details hidden or generic */}
             <li>準備中...</li>
          </ul>
          <button
            disabled
            className="w-full mt-6 px-6 py-3 rounded-xl font-medium bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
          >
            準備中
          </button>
        </div>

        {/* Pro Plan */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border-2 border-zinc-200 dark:border-zinc-700 p-6 flex flex-col opacity-60">
          <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Pro
          </h3>
          <p className="text-zinc-500 dark:text-zinc-500 mt-2">
             準備中
          </p>
          <p className="text-5xl font-extrabold text-zinc-900 dark:text-zinc-100 my-6">
            -
            <span className="text-lg font-medium">/月</span>
          </p>
           <ul className="space-y-3 text-zinc-600 dark:text-zinc-400 flex-grow text-sm">
             {/* Details hidden or generic */}
             <li>準備中...</li>
          </ul>
          <button
            disabled
            className="w-full mt-6 px-6 py-3 rounded-xl font-medium bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
          >
            準備中
          </button>
        </div>
      </div>
    </div>
  );
}
