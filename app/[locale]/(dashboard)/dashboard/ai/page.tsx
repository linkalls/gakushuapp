"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { PLAN_LIMITS, type SubscriptionPlan } from "@/lib/billing";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Deck {
  id: string;
  name: string;
}

interface SubscriptionInfo {
  plan: SubscriptionPlan;
  status: string;
  periodEnd: Date | null; // Dateオブジェクト
  cancelAtPeriodEnd: boolean | null;
}

export default function AIGenerationPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string>("");
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [usageCount, setUsageCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Text generation
  const [text, setText] = useState("");
  const [textCount, setTextCount] = useState(10);
  const [customPrompt, setCustomPrompt] = useState("");
  const [cardType, setCardType] = useState<"qa" | "true-false" | "detailed">("detailed");

  // File upload
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [fileCount, setFileCount] = useState(10);
  const [fileCustomPrompt, setFileCustomPrompt] = useState("");
  const [fileCardType, setFileCardType] = useState<"qa" | "true-false" | "detailed">("detailed");

  useEffect(() => {
    loadDecks();
    loadSubscription();
  }, []);

  const loadDecks = async () => {
    try {
      const response = await fetch("/api/decks");
      if (response.ok) {
        const data = await response.json();
        setDecks(data);
        if (data.length > 0) {
          setSelectedDeckId(data[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to load decks:", error);
    }
  };

  const loadSubscription = async () => {
    try {
      const { data: subscriptions } = await authClient.subscription.list({});

      let plan: SubscriptionPlan = "free";
      let status = "none";
      let periodEnd: Date | null = null;
      let cancelAtPeriodEnd: boolean | null = null;

      if (subscriptions && subscriptions.length > 0) {
        const activeSub = subscriptions.find(
          (sub) => sub.status === "active" || sub.status === "trialing"
        );

        if (activeSub) {
          plan = activeSub.plan as SubscriptionPlan;
          status = activeSub.status;
          // periodEndはDateオブジェクトで返ってくる
          periodEnd = activeSub.periodEnd ? new Date(activeSub.periodEnd) : null;
          cancelAtPeriodEnd = activeSub.cancelAtPeriodEnd ?? null;
        }
      }

      setSubscription({
        plan,
        status,
        periodEnd,
        cancelAtPeriodEnd,
      });

      // DBから実際の使用回数を取得
      const sessionResponse = await authClient.getSession();
      if (sessionResponse.data?.user) {
        const user = sessionResponse.data.user as any;
        const now = Date.now();
        const oneMonth = 30 * 24 * 60 * 60 * 1000;
        const aiUsageResetAt = user.aiUsageResetAt || 0;
        const shouldReset = now - aiUsageResetAt > oneMonth;

        // 月次リセットが必要な場合は0、そうでなければ現在のカウント
        setUsageCount(shouldReset ? 0 : (user.aiUsageCount || 0));
      } else {
        setUsageCount(0);
      }
    } catch (error) {
      console.error("Failed to load subscription:", error);
      // Set default free plan on error
      setSubscription({
        plan: "free",
        status: "none",
        periodEnd: null,
        cancelAtPeriodEnd: null,
      });
    }
  };

  const getPlanLimits = () => {
    if (!subscription) return null;
    return PLAN_LIMITS[subscription.plan];
  };

  const getUsageStats = () => {
    if (!subscription) return null;
    const limits = PLAN_LIMITS[subscription.plan];
    const remaining = limits.aiGenerationsPerMonth - usageCount;
    return {
      limit: limits.aiGenerationsPerMonth,
      remaining: remaining > 0 ? remaining : 0,
    };
  };

  const handleGenerateFromText = async () => {
    if (!text.trim() || !selectedDeckId) {
      alert("テキストとデッキを選択してください");
      return;
    }

    const limits = getPlanLimits();
    if (limits && text.length > limits.textInputMaxChars) {
      alert(
        `テキストが長すぎます。現在のプラン(${subscription?.plan})では${limits.textInputMaxChars.toLocaleString()}文字までです。\n入力文字数: ${text.length.toLocaleString()}文字`
      );
      return;
    }

    const stats = getUsageStats();
    if (stats && stats.remaining <= 0) {
      alert("今月のAI生成回数の上限に達しました。プランをアップグレードしてください。");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/ai/generate/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          deckId: selectedDeckId,
          count: textCount,
          customPrompt: customPrompt || undefined,
          cardType,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`成功！${data.cardsGenerated}枚のカードを生成しました。\n残り: ${data.remaining}/${data.limit}回`);
        setText("");
        setCustomPrompt("");
        // DBから最新の使用回数を再取得
        await loadSubscription();
      } else {
        const error = await response.json();
        alert(`エラー: ${error.error || error.message}`);
      }
    } catch (error) {
      console.error("Failed to generate cards:", error);
      alert("カード生成に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateFromPDF = async () => {
    if (!pdfFile || !selectedDeckId) {
      alert("PDFファイルとデッキを選択してください");
      return;
    }

    const limits = getPlanLimits();
    const fileSizeMB = pdfFile.size / (1024 * 1024);

    if (limits && fileSizeMB > limits.pdfMaxSizeMB) {
      alert(
        `PDFファイルが大きすぎます。現在のプラン(${subscription?.plan})では${limits.pdfMaxSizeMB}MBまでです。\nファイルサイズ: ${fileSizeMB.toFixed(2)}MB`
      );
      return;
    }

    const stats = getUsageStats();
    if (stats && stats.remaining <= 0) {
      alert("今月のAI生成回数の上限に達しました。プランをアップグレードしてください。");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", pdfFile);
      formData.append("deckId", selectedDeckId);
      formData.append("count", fileCount.toString());
      if (fileCustomPrompt) {
        formData.append("customPrompt", fileCustomPrompt);
      }
      formData.append("cardType", fileCardType);

      const response = await fetch("/api/ai/generate/pdf", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        alert(`成功！${data.cardsGenerated}枚のカードを生成しました。\n残り: ${data.remaining}/${data.limit}回`);
        setPdfFile(null);
        setFileCustomPrompt("");
        // DBから最新の使用回数を再取得
        await loadSubscription();
      } else {
        const error = await response.json();
        alert(`エラー: ${error.error || error.message}`);
      }
    } catch (error) {
      console.error("Failed to generate cards:", error);
      alert("カード生成に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateFromImage = async () => {
    if (!imageFile || !selectedDeckId) {
      alert("画像ファイルとデッキを選択してください");
      return;
    }

    const stats = getUsageStats();
    if (stats && stats.remaining <= 0) {
      alert("今月のAI生成回数の上限に達しました。プランをアップグレードしてください。");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", imageFile);
      formData.append("deckId", selectedDeckId);
      formData.append("count", fileCount.toString());

      const response = await fetch("/api/ai/generate/image", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        alert(`成功！${data.cardsGenerated}枚のカードを生成しました。`);
        setImageFile(null);
        // DBから最新の使用回数を再取得
        await loadSubscription();
      } else {
        const error = await response.json();
        alert(`エラー: ${error.error || error.message}`);
      }
    } catch (error) {
      console.error("Failed to generate cards:", error);
      alert("カード生成に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const limits = getPlanLimits();
  const stats = getUsageStats();

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">AI カード生成</h1>
        <p className="text-muted-foreground">
          AIを使って教材から自動的にフラッシュカードを生成します
        </p>
      </div>

      {/* AI Usage Stats */}
      {subscription && limits && stats && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>AI 使用状況</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>プラン:</span>
                <span className="font-bold capitalize">
                  {subscription.plan === "free" ? "Free" : subscription.plan === "lite" ? "Lite" : "Pro"}
                </span>
              </div>

              {subscription.status !== "none" && (
                <>
                  <div className="flex justify-between items-center text-sm">
                    <span>ステータス:</span>
                    <span className={`font-medium ${subscription.status === "active" ? "text-green-600" :
                      subscription.status === "trialing" ? "text-blue-600" :
                        "text-gray-600"
                      }`}>
                      {subscription.status === "active" ? "有効" :
                        subscription.status === "trialing" ? "トライアル中" :
                          subscription.status}
                    </span>
                  </div>
                  {subscription.periodEnd && (
                    <div className="flex justify-between items-center text-sm">
                      <span>次回更新日:</span>
                      <span>{new Date(subscription.periodEnd).toLocaleDateString('ja-JP')}</span>
                    </div>
                  )}
                  {subscription.cancelAtPeriodEnd && (
                    <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm">
                      <p className="text-yellow-800 dark:text-yellow-400">
                        ⚠️ このサブスクリプションは更新日に終了します
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-between items-center">
                <span>今月の使用回数:</span>
                <span>
                  {usageCount} / {stats.limit}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>残り回数:</span>
                <span className={`font-bold ${stats.remaining === 0 ? "text-red-600" : "text-green-600"}`}>
                  {stats.remaining}
                </span>
              </div>

              {/* Plan Limits */}
              <div className="border-t pt-3 mt-3 space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>テキスト入力制限:</span>
                  <span>{limits.textInputMaxChars.toLocaleString()}文字まで</span>
                </div>
                <div className="flex justify-between">
                  <span>PDFサイズ制限:</span>
                  <span>{limits.pdfMaxSizeMB}MBまで</span>
                </div>
                <div className="flex justify-between">
                  <span>月間生成回数:</span>
                  <span>{limits.aiGenerationsPerMonth}回まで</span>
                </div>
              </div>

              {stats.remaining === 0 && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mt-4">
                  <p className="text-red-600 dark:text-red-400 font-medium">
                    今月の生成回数の上限に達しました
                  </p>
                  <span
                    className="text-gray-500 dark:text-gray-400 text-sm mt-2 inline-block cursor-not-allowed"
                  >
                    プランをアップグレード (準備中) →
                  </span>
                </div>
              )}

              {subscription.plan === "free" && (
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
                  <p className="text-blue-600 dark:text-blue-400 text-sm">
                    💡 Liteプラン(¥480/月)で月100回、Proプラン(¥980/月)で月500回まで生成できます (準備中)
                  </p>
                  <span
                    className="text-gray-500 dark:text-gray-400 text-sm mt-2 inline-block cursor-not-allowed"
                  >
                    プランを確認 (準備中) →
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deck Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>デッキを選択</CardTitle>
        </CardHeader>
        <CardContent>
          <select
            value={selectedDeckId}
            onChange={(e) => setSelectedDeckId(e.target.value)}
            className="w-full p-2 border rounded bg-background text-foreground dark:bg-zinc-800 dark:border-zinc-700"
          >
            {decks.map((deck) => (
              <option key={deck.id} value={deck.id}>
                {deck.name}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* Text Generation */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>テキストから生成</CardTitle>
          <CardDescription>
            学習したいテキストを貼り付けて、AIがフラッシュカードを自動生成します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="ここにテキストを入力してください..."
              className="w-full h-40 p-3 border rounded resize-none bg-background text-foreground dark:bg-zinc-800 dark:border-zinc-700 dark:placeholder-zinc-400"
              disabled={isLoading}
            />
            <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
              {text.length.toLocaleString()} / {limits?.textInputMaxChars.toLocaleString() || "---"}文字
              {limits && text.length > limits.textInputMaxChars && (
                <span className="text-red-600 ml-2">制限を超えています</span>
              )}
            </div>
          </div>

          {/* Card Type Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">カードタイプ</label>
            <select
              value={cardType}
              onChange={(e) => setCardType(e.target.value as any)}
              className="w-full p-2 border rounded bg-background text-foreground dark:bg-zinc-800 dark:border-zinc-700"
              disabled={isLoading}
            >
              <option value="detailed">詳細な解説形式 (デフォルト)</option>
              <option value="qa">一問一答形式</option>
              <option value="true-false">正誤問題形式</option>
            </select>
          </div>

          {/* Custom Prompt */}
          <div>
            <label className="block text-sm font-medium mb-2">
              カスタムプロンプト (オプション)
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="追加の指示があれば入力してください (例: 専門用語を含めて、初心者向けに)"
              className="w-full h-20 p-3 border rounded resize-none bg-background text-foreground dark:bg-zinc-800 dark:border-zinc-700 dark:placeholder-zinc-400"
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              生成枚数:
              <Input
                type="number"
                value={textCount}
                onChange={(e) => setTextCount(parseInt(e.target.value) || 10)}
                min="1"
                max="400"
                className="w-20"
                disabled={isLoading}
              />
            </label>
            <Button
              onClick={handleGenerateFromText}
              disabled={isLoading || !text.trim() || (limits ? text.length > limits.textInputMaxChars : false)}
            >
              {isLoading ? "生成中..." : "生成"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* PDF Generation */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>PDFから生成</CardTitle>
          <CardDescription>
            PDFファイルをアップロードして、内容からフラッシュカードを自動生成します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="file"
            accept=".pdf"
            onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
            disabled={isLoading}
          />
          {pdfFile && (
            <div className="text-sm space-y-1">
              <p className="text-muted-foreground">
                選択されたファイル: {pdfFile.name}
              </p>
              <p className="text-muted-foreground">
                サイズ: {(pdfFile.size / (1024 * 1024)).toFixed(2)}MB / {limits?.pdfMaxSizeMB || "---"}MB
                {limits && pdfFile.size / (1024 * 1024) > limits.pdfMaxSizeMB && (
                  <span className="text-red-600 ml-2">制限を超えています</span>
                )}
              </p>
            </div>
          )}

          {/* Card Type Selection for PDF */}
          <div>
            <label className="block text-sm font-medium mb-2">カードタイプ</label>
            <select
              value={fileCardType}
              onChange={(e) => setFileCardType(e.target.value as any)}
              className="w-full p-2 border rounded bg-background text-foreground dark:bg-zinc-800 dark:border-zinc-700"
              disabled={isLoading}
            >
              <option value="detailed">詳細な解説形式 (デフォルト)</option>
              <option value="qa">一問一答形式</option>
              <option value="true-false">正誤問題形式</option>
            </select>
          </div>

          {/* Custom Prompt for PDF */}
          <div>
            <label className="block text-sm font-medium mb-2">
              カスタムプロンプト (オプション)
            </label>
            <textarea
              value={fileCustomPrompt}
              onChange={(e) => setFileCustomPrompt(e.target.value)}
              placeholder="追加の指示があれば入力してください (例: 図表の説明を重点的に、数式を含めて)"
              className="w-full h-20 p-3 border rounded resize-none bg-background text-foreground dark:bg-zinc-800 dark:border-zinc-700 dark:placeholder-zinc-400"
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              生成枚数:
              <Input
                type="number"
                value={fileCount}
                onChange={(e) => setFileCount(parseInt(e.target.value) || 10)}
                min="1"
                max="400"
                className="w-20"
                disabled={isLoading}
              />
            </label>
            <Button
              onClick={handleGenerateFromPDF}
              disabled={isLoading || !pdfFile}
            >
              {isLoading ? "生成中..." : "生成"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Image Generation */}
      <Card>
        <CardHeader>
          <CardTitle>画像から生成</CardTitle>
          <CardDescription>
            画像をアップロードして、その内容からフラッシュカードを自動生成します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            disabled={isLoading}
          />
          {imageFile && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                選択されたファイル: {imageFile.name}
              </p>
              <img
                src={URL.createObjectURL(imageFile)}
                alt="Preview"
                className="max-w-md max-h-64 object-contain border rounded"
              />
            </div>
          )}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              生成枚数:
              <Input
                type="number"
                value={fileCount}
                onChange={(e) => setFileCount(parseInt(e.target.value) || 10)}
                min="1"
                max="400"
                className="w-20"
                disabled={isLoading}
              />
            </label>
            <Button
              onClick={handleGenerateFromImage}
              disabled={isLoading || !imageFile}
            >
              {isLoading ? "生成中..." : "生成"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
