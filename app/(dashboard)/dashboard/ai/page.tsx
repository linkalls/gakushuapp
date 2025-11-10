"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";

interface Deck {
  id: string;
  name: string;
}

interface AIUsage {
  plan: string;
  usageCount: number;
  remaining: number;
  unlimited: boolean;
}

export default function AIGenerationPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string>("");
  const [aiUsage, setAIUsage] = useState<AIUsage | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Text generation
  const [text, setText] = useState("");
  const [textCount, setTextCount] = useState(10);

  // File upload
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [fileCount, setFileCount] = useState(10);

  useEffect(() => {
    loadDecks();
    loadAIUsage();
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

  const loadAIUsage = async () => {
    try {
      const response = await fetch("/api/ai/usage");
      if (response.ok) {
        const data = await response.json();
        setAIUsage(data);
      }
    } catch (error) {
      console.error("Failed to load AI usage:", error);
    }
  };

  const handleGenerateFromText = async () => {
    if (!text.trim() || !selectedDeckId) {
      alert("テキストとデッキを選択してください");
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
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`成功！${data.cardsGenerated}枚のカードを生成しました。`);
        setText("");
        loadAIUsage();
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

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", pdfFile);
      formData.append("deckId", selectedDeckId);
      formData.append("count", fileCount.toString());

      const response = await fetch("/api/ai/generate/pdf", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        alert(`成功！${data.cardsGenerated}枚のカードを生成しました。`);
        setPdfFile(null);
        loadAIUsage();
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
        loadAIUsage();
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

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">AI カード生成</h1>
        <p className="text-muted-foreground">
          AIを使って教材から自動的にフラッシュカードを生成します
        </p>
      </div>

      {/* AI Usage Stats */}
      {aiUsage && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>AI 使用状況</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>
                プラン: <span className="font-bold">{aiUsage.plan === "pro" ? "Pro" : "Free"}</span>
              </p>
              {aiUsage.unlimited ? (
                <p className="text-green-600 font-semibold">無制限に使用可能</p>
              ) : (
                <>
                  <p>
                    今月の使用回数: {aiUsage.usageCount} / 5
                  </p>
                  <p>
                    残り回数: <span className="font-bold">{aiUsage.remaining}</span>
                  </p>
                  {aiUsage.remaining === 0 && (
                    <p className="text-red-600">
                      制限に達しました。Pro プランにアップグレードすると無制限に使用できます。
                    </p>
                  )}
                </>
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
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="ここにテキストを入力してください..."
            className="w-full h-40 p-3 border rounded resize-none bg-background text-foreground dark:bg-zinc-800 dark:border-zinc-700 dark:placeholder-zinc-400"
            disabled={isLoading}
          />
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              生成枚数:
              <Input
                type="number"
                value={textCount}
                onChange={(e) => setTextCount(parseInt(e.target.value) || 10)}
                min="1"
                max="50"
                className="w-20"
                disabled={isLoading}
              />
            </label>
            <Button
              onClick={handleGenerateFromText}
              disabled={isLoading || !text.trim()}
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
            <p className="text-sm text-muted-foreground">
              選択されたファイル: {pdfFile.name}
            </p>
          )}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              生成枚数:
              <Input
                type="number"
                value={fileCount}
                onChange={(e) => setFileCount(parseInt(e.target.value) || 10)}
                min="1"
                max="50"
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
                max="50"
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
