# Session 3: カード状態システムの修正

## 修正日時
2025-11-10

## 概要

学習画面の表示とカード状態の統計計算に関する複数の問題を修正しました。

## 問題点

### 1. 学習画面の進捗が不明瞭
- ユーザーのコメント: "decksの問題といてるときの数字のところはもう少し見やすく今どれをやってるのかわかりやすく"
- **問題:** どの種類のカード（新規/学習中/復習）を学習しているのか分からない
- **影響:** ユーザーが現在の学習状況を把握しづらい

### 2. 残りカード数の計算が不正確
- **問題:** 初期状態を基に計算していたため、リアルタイムで状態が変わっても反映されない
- **影響:** 学習中に状態が更新されても、残りカード数が正しく表示されない

### 3. 「今日」のカード数が不正確
- ユーザーのコメント: "新規のやつを今日に入れるのはやめろよ"
- **問題:** `dueCards`（今日復習するべきカード）に新規カード(state: 0)が含まれていた
- **影響:** 「今日: 21」のような高い数値が表示され、ユーザーが混乱する

### 4. モバイル向けナビゲーションがない
- ユーザーのコメント: "mobile向けにheaderをハンバーガーメニューかなんかで使える様に"
- **問題:** スマートフォンでナビゲーションメニューが使いづらい
- **影響:** モバイルユーザーの操作性が悪い

## 修正内容

### 1. 学習画面の改善 (`/app/(dashboard)/dashboard/study/page.tsx`)

#### A. カード状態の可視化

```typescript
// カード状態をラベルと色で表示
const getStateLabel = (state: number) => {
  switch (state) {
    case 0: return "新規";
    case 1: return "学習中";
    case 2: return "復習";
    case 3: return "再学習";
    default: return "不明";
  }
};

const getStateColor = (state: number) => {
  switch (state) {
    case 0: return "bg-blue-500";    // 新規: 青
    case 1: return "bg-yellow-500";  // 学習中: 黄
    case 2: return "bg-green-500";   // 復習: 緑
    case 3: return "bg-orange-500";  // 再学習: オレンジ
    default: return "bg-gray-500";
  }
};
```

#### B. リアルタイムの状態更新

```typescript
const submitReview = async (rating: number) => {
  const response = await fetch("/api/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cardId: currentCard.id,
      rating,
    }),
  });
  
  const result = await response.json();
  
  // APIからの最新状態でローカルのカードを更新
  setCards((prevCards) =>
    prevCards.map((card, idx) =>
      idx === currentIndex
        ? { ...card, state: result.state, lapses: result.lapses }
        : card
    )
  );
  
  setCurrentIndex((prev) => prev + 1);
};
```

#### C. 正確な残りカード数計算

**修正前:**
```typescript
// 初期状態からカウントを引いていた（不正確）
const remaining = totalCards - reviewed;
```

**修正後:**
```typescript
// 現在以降のカードの実際の状態を直接カウント
const remainingCardsList = cards.slice(currentIndex);
const remainingNew = remainingCardsList.filter((c) => c.state === 0).length;
const remainingLearning = remainingCardsList.filter((c) => c.state === 1 || c.state === 3).length;
const remainingReview = remainingCardsList.filter((c) => c.state === 2).length;
```

#### D. 詳細な進捗表示

```tsx
<div className="grid grid-cols-3 gap-2 text-sm">
  <div className="text-center">
    <div className="font-semibold text-blue-600">新規</div>
    <div>{remainingNew}</div>
  </div>
  <div className="text-center">
    <div className="font-semibold text-yellow-600">学習中</div>
    <div>{remainingLearning}</div>
  </div>
  <div className="text-center">
    <div className="font-semibold text-green-600">復習</div>
    <div>{remainingReview}</div>
  </div>
</div>
```

### 2. デッキ詳細画面の改善 (`/app/(dashboard)/dashboard/decks/[id]/page.tsx`)

#### A. 統計API連携

```typescript
interface DeckStats {
  totalCards: number;
  newCards: number;
  learningCards: number;
  reviewCards: number;
  dueCards: number;
  progress: number;
}

const fetchDeckStats = async () => {
  const response = await fetch(`/api/decks/${id}/stats`);
  const data = await response.json();
  setStats(data);
};
```

#### B. 詳細統計の表示

```tsx
{stats && (
  <div className="grid grid-cols-2 gap-4">
    <div>
      <span className="font-semibold text-blue-600">新規:</span> {stats.newCards}
    </div>
    <div>
      <span className="font-semibold text-yellow-600">学習中:</span> {stats.learningCards}
    </div>
    <div>
      <span className="font-semibold text-green-600">復習:</span> {stats.reviewCards}
    </div>
    <div>
      <span className="font-semibold text-purple-600">今日:</span> {stats.dueCards}
    </div>
  </div>
)}
```

### 3. API修正 (`/app/api/[[...route]]/route.ts`)

#### A. dueCardsから新規カードを除外

**修正前 (Line 135-155):**
```typescript
const dueCardsResult = await db
  .select({ count: count() })
  .from(cards)
  .where(
    and(
      inArray(cards.deckId, deckIds),
      lte(cards.due, currentTime) // 新規カードも含まれてしまう
    )
  )
  .get();
```

**修正後:**
```typescript
const dueCardsResult = await db
  .select({ count: count() })
  .from(cards)
  .where(
    and(
      inArray(cards.deckId, deckIds),
      sql`${cards.state} != 0`, // 新規カード(state: 0)を除外
      lte(cards.due, currentTime)
    )
  )
  .get();
```

#### B. 統計定義の統一化

全てのAPI endpointで統一した統計定義を使用:

```typescript
// 新規カード: state === 0
const newCardsResult = await db
  .select({ count: count() })
  .from(cards)
  .where(
    and(
      inArray(cards.deckId, deckIds),
      eq(cards.state, 0)
    )
  )
  .get();

// 学習中カード: state === 1 or 3
const learningCardsResult = await db
  .select({ count: count() })
  .from(cards)
  .where(
    and(
      inArray(cards.deckId, deckIds),
      sql`${cards.state} IN (1, 3)`
    )
  )
  .get();

// 復習カード: state === 2
const reviewCardsResult = await db
  .select({ count: count() })
  .from(cards)
  .where(
    and(
      inArray(cards.deckId, deckIds),
      eq(cards.state, 2)
    )
  )
  .get();

// 今日復習するべきカード: state !== 0 かつ due <= now
const dueCardsResult = await db
  .select({ count: count() })
  .from(cards)
  .where(
    and(
      inArray(cards.deckId, deckIds),
      sql`${cards.state} != 0`, // 新規カードを除外
      lte(cards.due, currentTime)
    )
  )
  .get();
```

### 4. モバイルナビゲーション (`/app/(dashboard)/layout.tsx`)

#### A. ハンバーガーメニューの実装

```typescript
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/decks", label: "Decks" },
  { href: "/dashboard/study", label: "Study" },
  { href: "/dashboard/stats", label: "Stats" },
  { href: "/dashboard/import", label: "Import" },
  { href: "/dashboard/profile", label: "Profile" },
];
```

#### B. レスポンシブナビゲーションUI

```tsx
{/* モバイルメニューボタン */}
<button
  className="md:hidden"
  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
>
  {mobileMenuOpen ? <X /> : <Menu />}
</button>

{/* モバイルメニューパネル */}
{mobileMenuOpen && (
  <div className="md:hidden absolute top-16 left-0 right-0 bg-white shadow-lg z-50">
    {navLinks.map((link) => (
      <Link
        key={link.href}
        href={link.href}
        className="block px-4 py-2 hover:bg-gray-100"
        onClick={() => setMobileMenuOpen(false)}
      >
        {link.label}
      </Link>
    ))}
  </div>
)}
```

## 技術的詳細

### FSRSアルゴリズムの動作確認

ユーザーから提供されたログで、FSRSが正しく動作していることを確認:

```
Rating: 1 → state: 1 (Learning), stability: 0.4, difficulty: 7.9
Rating: 2 → state: 1 (Learning), stability: 1.4, difficulty: 8.0
Rating: 3 → state: 2 (Review), stability: 5.3, difficulty: 7.7
Rating: 4 → state: 2 (Review), stability: 27.3, difficulty: 7.0
```

→ FSRSは正しく機能しており、問題は統計の表示ロジックにあることが判明

### データベーススキーマ

```typescript
export const cards = sqliteTable("cards", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  deckId: integer("deck_id").references(() => decks.id, { onDelete: "cascade" }),
  front: text("front").notNull(),
  back: text("back").notNull(),
  due: integer("due").notNull().default(0),
  stability: real("stability").notNull().default(0),
  difficulty: real("difficulty").notNull().default(0),
  state: integer("state").notNull().default(0), // 0: New, 1: Learning, 2: Review, 3: Relearning
  reps: integer("reps").notNull().default(0),
  lapses: integer("lapses").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
```

## 効果

### 1. 学習体験の向上
- ✅ 現在学習中のカードタイプが一目で分かる
- ✅ リアルタイムで状態変化が反映される
- ✅ 残りカード数が正確に表示される

### 2. 統計の正確性
- ✅ 「今日」のカード数に新規カードが含まれなくなった
- ✅ 全てのAPI endpointで統一された統計定義を使用

### 3. モバイル対応
- ✅ スマートフォンでナビゲーションが使いやすくなった
- ✅ レスポンシブデザインの改善

## テスト

### 手動テスト項目

1. **学習画面:**
   - [ ] カード状態のバッジが正しい色で表示される
   - [ ] レビュー後、状態が即座に更新される
   - [ ] 残りカード数が正確にカウントされる
   - [ ] 新規→学習中→復習の遷移が正しく表示される

2. **デッキ詳細画面:**
   - [ ] 統計が正しく表示される
   - [ ] 「今日」に新規カードが含まれない
   - [ ] サブデッキの統計も正しく集計される

3. **モバイルナビゲーション:**
   - [ ] ハンバーガーメニューが動作する
   - [ ] リンクをタップするとメニューが閉じる
   - [ ] デスクトップでは従来のナビが表示される

## 今後の改善案

1. **パフォーマンス最適化:**
   - 統計計算のキャッシング
   - リアルタイム更新の最適化

2. **UI/UX改善:**
   - 状態遷移のアニメーション
   - より詳細な進捗グラフ
   - カスタマイズ可能な統計表示

3. **機能追加:**
   - カード状態のフィルタリング
   - 学習履歴の可視化
   - 統計のエクスポート機能

## 参考リンク

- [FSRS Algorithm](https://github.com/open-spaced-repetition/fsrs-rs)
- [Better Auth Documentation](https://www.better-auth.com/docs)
- [Drizzle ORM](https://orm.drizzle.team/)

## 関連ドキュメント

- [card-state-system.md](./card-state-system.md) - カード状態システムの詳細仕様
- [architecture.md](./architecture.md) - アプリケーション全体のアーキテクチャ
