"use client";

import { useState } from "react";

type Plan = "free" | "pro";

export default function BillingPage() {
  const [currentPlan, setCurrentPlan] = useState<Plan>("free");

  const handleSelectPlan = (plan: Plan) => {
    // This will be replaced with Stripe Checkout logic
    alert(`「${plan.toUpperCase()}」プランを選択しました。現在は実装準備中です。`);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          課金情報
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-2">
          プランを選択して、GakushuAppの全機能を開放しましょう。
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-8">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          現在のプラン
        </h2>
        <p className="text-4xl font-bold text-zinc-800 dark:text-zinc-200">
          {currentPlan === "free" ? "Free" : "Pro"}
        </p>
        <p className="text-zinc-500 dark:text-zinc-500 mt-1">
          {currentPlan === "free"
            ? "基本的な学習機能を利用できます。"
            : "全ての機能が利用可能です。"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Free Plan */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-8 flex flex-col">
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
          <ul className="space-y-3 text-zinc-600 dark:text-zinc-400 flex-grow">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✔</span> デッキ作成 (3つまで)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✔</span> 基本的なFSRS学習
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✔</span> デッキのインポート
            </li>
          </ul>
          <button
            disabled
            className="w-full mt-8 px-6 py-3 bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 rounded-xl font-medium cursor-not-allowed"
          >
            現在のプラン
          </button>
        </div>

        {/* Pro Plan */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border-2 border-blue-500 p-8 flex flex-col">
           <div className="text-center">
             <span className="inline-block bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4">
                おすすめ
             </span>
           </div>
          <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Pro
          </h3>
          <p className="text-zinc-500 dark:text-zinc-500 mt-2">
            学習を最大限効率化したい方に
          </p>
          <p className="text-5xl font-extrabold text-zinc-900 dark:text-zinc-100 my-6">
            ¥980
            <span className="text-lg font-medium">/月</span>
          </p>
          <ul className="space-y-3 text-zinc-600 dark:text-zinc-400 flex-grow">
            <li className="flex items-center gap-2">
              <span className="text-blue-500">✔</span>
              <strong>無制限の</strong>デッキ作成
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-500">✔</span> 高度な学習統計
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-500">✔</span>
              <strong>デッキ共有機能</strong>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-500">✔</span>
              <strong>ランキング機能</strong>
            </li>
             <li className="flex items-center gap-2">
              <span className="text-blue-500">✔</span> 優先サポート
            </li>
          </ul>
          <button
            onClick={() => handleSelectPlan("pro")}
            className="w-full mt-8 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Proプランを選択
          </button>
        </div>
      </div>
       <div className="text-center text-sm text-zinc-500 dark:text-zinc-500">
          <p>Stripeを利用した安全な決済です。いつでもキャンセルできます。</p>
          <p className="mt-4">この機能は現在準備中です。ボタンを押しても実際の課金は発生しません。</p>
       </div>
    </div>
  );
}
