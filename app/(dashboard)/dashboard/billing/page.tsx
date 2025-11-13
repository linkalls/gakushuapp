"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Plan = "free" | "lite" | "pro";

interface ActiveSubscription {
  id: string;
  plan: Plan;
  status: string;
  stripeSubscriptionId?: string;
}

export default function BillingPage() {
  const { push } = useRouter();
  const [currentPlan, setCurrentPlan] = useState<Plan>("free");
  const [activeSubscription, setActiveSubscription] = useState<ActiveSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCurrentPlan();
  }, []);

  useEffect(() => {
    // URLパラメータをチェックして成功時にリロード
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      // パラメータをクリア
      window.history.replaceState({}, '', '/dashboard/billing');
      // プランをリロード
      loadCurrentPlan();
    }
  }, []);

  const loadCurrentPlan = async () => {
    try {
      const { data: subscriptions } = await authClient.subscription.list({});

      // デフォルトはfree
      let foundPlan: Plan = "free";
      let foundSub: ActiveSubscription | null = null;

      if (subscriptions && subscriptions.length > 0) {
        const activeSub = subscriptions.find(
          (sub) => sub.status === "active" || sub.status === "trialing"
        );

        if (activeSub) {
          foundPlan = activeSub.plan as Plan;
          foundSub = {
            id: activeSub.id,
            plan: activeSub.plan as Plan,
            status: activeSub.status,
            stripeSubscriptionId: activeSub.stripeSubscriptionId,
          };
        }
      }

      setCurrentPlan(foundPlan);
      setActiveSubscription(foundSub);
    } catch (error) {
      console.error("Failed to load subscription:", error);
      // エラー時もfreeに設定
      setCurrentPlan("free");
      setActiveSubscription(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!activeSubscription) return;

    const confirmed = confirm(
      "サブスクリプションを解約しますか？\n次回更新日まで引き続きご利用いただけます。"
    );

    if (!confirmed) return;

    try {
      const { error } = await authClient.subscription.cancel({
        subscriptionId: activeSubscription.id,
        returnUrl: window.location.origin + "/dashboard/billing",
      });

      if (error) {
        alert(`エラー: ${error.message}`);
      } else {
        // 解約成功後、プラン情報をリロード
        await loadCurrentPlan();
        alert("サブスクリプションの解約が完了しました。次回更新日まで引き続きご利用いただけます。");
      }
    } catch (error) {
      console.error("Failed to cancel subscription:", error);
      alert("解約処理に失敗しました");
    }
  };

  const handleSelectPlan = async (plan: "lite" | "pro") => {
    try {
      // 既存のサブスクリプションがある場合は、subscriptionIdを渡す
      const upgradeParams: any = {
        plan,
        successUrl: window.location.origin + "/dashboard/billing?success=true",
        cancelUrl: window.location.origin + "/dashboard/billing",
      };

      if (activeSubscription?.id) {
        upgradeParams.subscriptionId = activeSubscription.id;
      }

      const { data, error } = await authClient.subscription.upgrade(upgradeParams);

      if (error) {
        alert(`エラー: ${error.message}`);
        return;
      }

      // upgradeは直接リダイレクトするため、dataは通常空
      // Stripeチェックアウトページへのリダイレクトは自動で行われる

    } catch (error) {
      console.error("Failed to upgrade:", error);
      alert("プランの変更に失敗しました");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          課金情報
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-2">
          プランを選択して、gakushukunAppの全機能を開放しましょう。
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-8">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          現在のプラン
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-4xl font-bold text-zinc-800 dark:text-zinc-200">
              {isLoading ? "読み込み中..." : currentPlan === "free" ? "Free" : currentPlan === "lite" ? "Lite" : "Pro"}
            </p>
            <p className="text-zinc-500 dark:text-zinc-500 mt-1">
              {currentPlan === "free"
                ? "基本的な学習機能を利用できます。"
                : currentPlan === "lite"
                  ? "月100回までのAI生成が可能です。"
                  : "月500回までのAI生成が可能です。"}
            </p>
          </div>
          {currentPlan !== "free" && !isLoading && (
            <button
              onClick={handleCancelSubscription}
              className="px-6 py-3 rounded-xl font-medium transition-colors bg-white dark:bg-zinc-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 border-2 border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700"
            >
              解約する
            </button>
          )}
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
              <span className="text-green-500">✔</span> AI生成: 月5回まで
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
            {currentPlan === "free" ? "現在のプラン" : "Freeプラン"}
          </button>
        </div>

        {/* Lite Plan */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col">
          <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Lite
          </h3>
          <p className="text-zinc-500 dark:text-zinc-500 mt-2">
            もっと学習したい方に
          </p>
          <p className="text-5xl font-extrabold text-zinc-900 dark:text-zinc-100 my-6">
            ¥480
            <span className="text-lg font-medium">/月</span>
          </p>
          <ul className="space-y-3 text-zinc-600 dark:text-zinc-400 flex-grow text-sm">
            <li className="flex items-center gap-2">
              <span className="text-blue-500">✔</span>{" "}
              <strong>AI生成: 月50回まで</strong>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-500">✔</span>{" "}
              <strong>テキスト入力: 10,000文字まで</strong>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-500">✔</span>{" "}
              <strong>PDF: 25MBまで</strong>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-500">✔</span> 高度な学習統計
            </li>
          </ul>
          <button
            onClick={() => handleSelectPlan("lite")}
            disabled={currentPlan === "lite"}
            className={`w-full mt-6 px-6 py-3 rounded-xl font-medium transition-colors ${currentPlan === "lite"
              ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
          >
            {currentPlan === "lite" ? "現在のプラン" : "Liteプランを選択"}
          </button>
        </div>

        {/* Pro Plan */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border-2 border-blue-500 p-6 flex flex-col">
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
          <ul className="space-y-3 text-zinc-600 dark:text-zinc-400 flex-grow text-sm">
            <li className="flex items-center gap-2">
              <span className="text-blue-500">✔</span>
              <strong>AI生成: 月100回まで</strong>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-500">✔</span>
              <strong>テキスト入力: 25,000文字まで</strong>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-500">✔</span>
              <strong>PDF: 50MBまで</strong>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-500">✔</span> デッキ共有機能
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-500">✔</span> ランキング機能
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-500">✔</span> 優先サポート
            </li>
          </ul>
          <button
            onClick={() => handleSelectPlan("pro")}
            disabled={currentPlan === "pro"}
            className={`w-full mt-6 px-6 py-3 rounded-xl font-medium transition-colors ${currentPlan === "pro"
              ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
          >
            {currentPlan === "pro" ? "現在のプラン" : "Proプランを選択"}
          </button>
        </div>
      </div>
      <div className="text-center text-sm text-zinc-500 dark:text-zinc-500">
        <p>Stripeを利用した安全な決済です。いつでもキャンセルできます。</p>
      </div>
    </div>
  );
}
