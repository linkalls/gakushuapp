# カード状態システムとFSRS統合

## カードの状態 (State)

Gakushuアプリでは、FSRSアルゴリズムを使用してカードの状態を管理しています。

### 状態の種類

| State | 名前 | 説明 | 次の状態への遷移 |
|-------|------|------|-----------------|
| 0 | 新規 (New) | まだ一度も学習していないカード | Rating 1-4 → State 1 または 2 |
| 1 | 学習中 (Learning) | 学習を開始したが、まだ短期記憶段階 | Rating 3-4 → State 2, Rating 1-2 → State 1のまま |
| 2 | 復習 (Review) | 長期記憶に定着しつつあり、長い間隔で復習 | Rating 1 → State 3, Rating 2-4 → State 2のまま |
| 3 | 再学習 (Relearning) | 忘れてしまったカードを再学習中 | Rating 3-4 → State 2, Rating 1-2 → State 3のまま |

## レビュー評価 (Rating)

| Rating | ラベル | 説明 | 次回復習時間 |
|--------|--------|------|------------|
| 1 | Again | 全く覚えていない | 1分後 |
| 2 | Hard | 思い出すのが難しい | 数分後 |
| 3 | Good | 正しく思い出せた | 数日後（Learning）または日数増加（Review） |
| 4 | Easy | 簡単に思い出せた | より長い間隔 |

## 統計の定義

### カード数の計算

```typescript
// 新規カード: state === 0
const newCards = cards.filter(c => c.state === 0).length;

// 学習中カード: state === 1 or 3
const learningCards = cards.filter(c => c.state === 1 || c.state === 3).length;

// 復習カード: state === 2
const reviewCards = cards.filter(c => c.state === 2).length;

// 今日復習するべきカード: due <= now かつ state !== 0
const dueCards = cards.filter(c => c.state !== 0 && c.due <= Date.now()).length;
```

### 重要な注意点

**「今日」(dueCards)には新規カード(state: 0)を含めない**

理由:
- 新規カードは`due`が現在時刻に設定されているため、技術的には「期限が来ている」
- しかし、まだ一度も学習していないため、「今日復習するべき」カードとは異なる
- 新規カードは「新規」として別にカウントし、「今日」には学習中・復習カードのみを含める

## FSRS統合の流れ

### 1. 新規カードの初期化

```typescript
const initialState = getInitialCardState();
// {
//   due: Date.now(), // 即座に利用可能
//   stability: 0,
//   difficulty: 0,
//   state: 0, // New
//   reps: 0,
//   lapses: 0
// }
```

### 2. カードのレビュー

```typescript
// ユーザーがカードをレビュー
const { card: updatedCard, log } = reviewCard(dbCard, rating);

// FSRSが新しい状態を計算
// - Rating 1-2: state: 1 (Learning) のまま、短い間隔で再表示
// - Rating 3-4: state: 2 (Review) に遷移、長い間隔で再表示
```

### 3. 状態遷移の例

**新規カード (state: 0) をレビュー:**
```
Rating 1 (Again) → state: 1 (Learning), due: +1分
Rating 2 (Hard) → state: 1 (Learning), due: +6分  
Rating 3 (Good) → state: 1 (Learning), due: +10分
Rating 4 (Easy) → state: 2 (Review), due: +8日
```

**学習中カード (state: 1) をレビュー:**
```
Rating 1 (Again) → state: 1 (Learning), due: +1分
Rating 2 (Hard) → state: 1 (Learning), due: +数分
Rating 3 (Good) → state: 2 (Review), due: +1日
Rating 4 (Easy) → state: 2 (Review), due: +2日
```

**復習カード (state: 2) をレビュー:**
```
Rating 1 (Again) → state: 3 (Relearning), due: +1分
Rating 2 (Hard) → state: 2 (Review), due: +短めの間隔
Rating 3 (Good) → state: 2 (Review), due: +通常の間隔
Rating 4 (Easy) → state: 2 (Review), due: +長めの間隔
```

## API実装

### GET /api/decks (with stats)

全デッキの統計を取得:

```typescript
{
  totalCards: number,      // 全カード数
  newCards: number,        // 新規カード数 (state === 0)
  learningCards: number,   // 学習中カード数 (state === 1 or 3)
  reviewCards: number,     // 復習カード数 (state === 2)
  dueCards: number,        // 今日復習するべきカード数 (state !== 0 && due <= now)
  progress: number         // 進捗率 ((total - new) / total * 100)
}
```

### GET /api/decks/:id/stats

特定デッキの統計を取得（サブデッキ含む）:

```typescript
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

### GET /api/cards/due

今日学習可能なカードを取得（新規カード含む）:

```typescript
// 学習用には新規カードも含める
const cardsList = await db
  .select()
  .from(cards)
  .where(
    and(
      eq(decks.userId, userId),
      lte(cards.due, currentTime) // 新規カードも含む
    )
  )
  .orderBy(cards.due)
  .all();
```

## フロントエンド実装

### 学習画面の統計計算

```typescript
// 残りのカード（現在以降）の状態を直接カウント
const remainingCardsList = cards.slice(currentIndex);

const remainingNew = remainingCardsList.filter((c) => c.state === 0).length;
const remainingLearning = remainingCardsList.filter((c) => c.state === 1 || c.state === 3).length;
const remainingReview = remainingCardsList.filter((c) => c.state === 2).length;
```

### デッキ一覧/詳細画面

```typescript
// APIから取得した統計を表示
<span>新規: {stats.newCards}</span>
<span>学習中: {stats.learningCards}</span>
<span>復習: {stats.reviewCards}</span>
<span>今日: {stats.dueCards}</span> {/* 新規カードを含まない */}
```

## トラブルシューティング

### 問題: 「今日」の数が多すぎる

**原因:** 新規カード(state: 0)が「今日」にカウントされている

**解決:** APIの`dueCards`計算で`sql\`${cards.state} != 0\``条件を追加

### 問題: 学習画面の統計が更新されない

**原因:** カードの状態更新後、ローカルの統計が再計算されていない

**解決:** レビュー後に`setCards`で状態を更新し、統計計算が自動的に再実行される

### 問題: カードが学習中(state: 1)から変わらない

**原因:** Rating 1または2を選択している（Againまたは Hard）

**解決:** これは正常な動作。Rating 3(Good)または4(Easy)を選ぶとstate: 2(Review)に遷移する

## 更新履歴

- 2025-11-10: 初版作成
  - カード状態システムの定義
  - FSRS統合の詳細
  - 統計計算ロジックの説明
  - 「今日」(dueCards)から新規カードを除外する修正
