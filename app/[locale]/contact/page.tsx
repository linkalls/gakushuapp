"use client";
import Link from "next/link";
import { useState } from "react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent("お問い合わせ（GakushuApp）");
    const body = encodeURIComponent(`名前: ${name}\nメール: ${email}\n\n${message}`);
    // 簡易実装: mailto にフォールバック。運用時は送信APIへ差し替えてください。
    window.location.href = `mailto:gakushukun@gmail.com?subject=${subject}&body=${body}`;
  };

  return (
    <div className="bg-white dark:bg-zinc-950 min-h-screen flex flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              GakushuApp
            </Link>
          </div>
        </div>
      </header>

      <main className="grow">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl font-bold mb-6">お問い合わせ</h1>
          <p className="mb-4">ご質問や開示請求はこちらのフォームからご連絡ください。送信後は管理者の確認をお待ちください。</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">お名前</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                placeholder="山田 太郎"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">メールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">お問い合わせ内容</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                rows={6}
                required
              />
            </div>

            <div className="flex items-center space-x-4">
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-zinc-900 hover:bg-zinc-800"
              >
                送信（メールアプリで開く）
              </button>
              <p className="text-sm text-zinc-500">※ 現在はメールアプリを使う簡易実装です。運用時はサーバー送信APIを用意してください。</p>
            </div>
          </form>
        </div>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          <div className="flex justify-center space-x-4">
            <Link href="/terms" className="hover:underline">Terms of Service</Link>
            <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
            <Link href="/tokusho" className="hover:underline">特定商取引法に基づく表記</Link>
          </div>
          <p className="mt-4">&copy; {new Date().getFullYear()} GakushuApp. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
