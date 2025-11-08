"use client";

import { useState } from "react";

interface ImportStats {
  decksImported: number;
  cardsImported: number;
  errors: string[];
}

export default function ImportPage() {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".apkg")) {
      setError("ファイルは .apkg 形式である必要があります");
      return;
    }

    setImporting(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/import/apkg", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "インポートに失敗しました");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          Ankiデータのインポート
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-2">
          .apkg ファイルをアップロードしてデータをインポート
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-sm border border-zinc-200 dark:border-zinc-800">
        <div className="space-y-6">
          <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              .apkg ファイルを選択
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              Ankiからエクスポートした .apkg ファイルを選択してください
            </p>
            <label className="inline-block px-6 py-3 bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 rounded-xl font-medium cursor-pointer hover:scale-105 transition-transform">
              ファイルを選択
              <input
                type="file"
                accept=".apkg"
                onChange={handleFileUpload}
                className="hidden"
                disabled={importing}
              />
            </label>
          </div>

          {importing && (
            <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-6 text-center">
              <div className="text-zinc-900 dark:text-zinc-100 font-medium mb-2">
                インポート中...
              </div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                ファイルを処理しています。しばらくお待ちください。
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
              <div className="text-red-900 dark:text-red-200 font-medium mb-2">
                エラーが発生しました
              </div>
              <div className="text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            </div>
          )}

          {result && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
              <div className="text-green-900 dark:text-green-200 font-medium mb-4">
                インポート完了！
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-green-800 dark:text-green-300">
                  <span>インポートされたデッキ:</span>
                  <span className="font-mono font-bold">
                    {result.decksImported}
                  </span>
                </div>
                <div className="flex justify-between text-green-800 dark:text-green-300">
                  <span>インポートされたカード:</span>
                  <span className="font-mono font-bold">
                    {result.cardsImported}
                  </span>
                </div>
                {result.errors.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800">
                    <div className="text-green-900 dark:text-green-200 font-medium mb-2">
                      警告:
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-green-800 dark:text-green-300">
                      {result.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-zinc-50 dark:bg-zinc-800 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          💡 使い方
        </h3>
        <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
          <li className="flex gap-2">
            <span>1.</span>
            <span>
              Ankiアプリで「ファイル」→「エクスポート」を選択
            </span>
          </li>
          <li className="flex gap-2">
            <span>2.</span>
            <span>
              エクスポート形式で「Ankiデッキパッケージ (.apkg)」を選択
            </span>
          </li>
          <li className="flex gap-2">
            <span>3.</span>
            <span>
              インポートしたいデッキを選択してエクスポート
            </span>
          </li>
          <li className="flex gap-2">
            <span>4.</span>
            <span>
              このページでエクスポートした .apkg ファイルをアップロード
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
