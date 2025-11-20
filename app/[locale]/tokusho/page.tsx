import { NextPage } from "next";
import Link from "next/link";

const TokushoPage: NextPage = () => {
  return (
    <div className="bg-white dark:bg-zinc-950 min-h-screen flex flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link
              href="/"
              className="text-xl font-bold text-zinc-900 dark:text-zinc-100"
            >
              GakushuApp
            </Link>
          </div>
        </div>
      </header>
      <main className="grow">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <article className="prose dark:prose-invert prose-lg prose-h1:text-4xl prose-h2:text-3xl mx-auto">
            <h1>特定商取引法に基づく表記</h1>

            <h2>販売事業者</h2>
            <p>GakushuApp</p>

            <h2>運営責任者</h2>
            <p>代表者名：poteto</p>

            <h2>所在地</h2>
            <p>
              安全上の理由から代表者の私的住所は公開しておりません。住所は法令に基づく開示請求があった場合に限り、所定の手続きに従って開示します。
            </p>

            <h2>連絡先</h2>
            <p>
              お問い合わせは以下のフォームよりご連絡ください：
              <br />
              <a href="/contact" className="hover:underline">
                お問い合わせフォーム
              </a>
            </p>

            <h2>商品代金以外の必要料金</h2>
            <p>消費税（表示価格に含む）／振込手数料（該当する場合）</p>

            <h2>代金の支払時期</h2>
            <p>購入時に決済処理を行います（Stripeによる決済）</p>

            <h2>商品の引渡し時期</h2>
            <p>デジタル商品は購入後すぐに提供します。物理的商品がある場合は個別に案内します。</p>

            <h2>返品・交換について</h2>
            <p>
              原則としてデジタル商品の返品・交換はお受けできません。物理商品やその他特別なケースは個別に対応します。
            </p>

            <h2>販売価格</h2>
            <p>各商品ページに表示された価格に従います。表示価格は税込です。</p>

            <h2>販売数量の制限</h2>
            <p>特に制限は設けていませんが、明示的な上限がある場合は商品ページに記載します。</p>

            <h2>表現・広告について</h2>
            <p>当サイトに記載の内容は、特定の状況により変更される場合があります。</p>

            <h2>お問い合わせ</h2>
            <p>ご不明点はメールにてお問い合わせください：<a href="mailto:gakushukun@gmail.com">gakushukun@gmail.com</a></p>
          </article>
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
};

export default TokushoPage;
