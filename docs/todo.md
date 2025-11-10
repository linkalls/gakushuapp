# gakushukun App - 開発進捗管理

## プロジェクト概要

Anki の代替となる、モダンでパフォーマンスの高い間隔反復学習アプリ。階層デッキ対応、.apkg インポート機能、最適化された API、Better Auth 統合を備えています。

## Tech Stack

- **Frontend**: Next.js 16 + React 19 + Tailwind CSS 4
- **Backend API**: Hono 4.10.4
- **Database**: Bun:SQLite + Drizzle ORM 0.44.7
- **SRS Algorithm**: ts-fsrs 5.2.3
- **Authentication**: Better Auth 1.3.34 (完全統合済み)
- **UI Components**: shadcn/ui (Button, Input, Card)
- **Dark Mode**: フル対応

---

## 完了した機能 ✅

### Phase 1-5: 基本構造とコア機能

- ✅ プロジェクト構造のセットアップ
- ✅ データベーススキーマ設計と実装
- ✅ Drizzle ORM 統合とマイグレーションシステム
- ✅ Hono API ルートの完全実装
- ✅ Dark Mode 完全対応
- ✅ ts-fsrs 統合（FSRS アルゴリズム）
- ✅ 全 CRUD API 実装
- ✅ 全 UI ページ（ダッシュボード、デッキ一覧、カード一覧、学習画面、統計画面）

### Phase 4: Anki 互換機能

- ✅ .apkg ファイルフォーマット調査
- ✅ .apkg インポート機能（JSZip + bun:sqlite）
- ✅ デッキ・カード・ノート情報の抽出
- ✅ 階層デッキ対応（`::` セパレータ）
- ✅ インポート UI 実装
- ✅ メディアファイル処理（画像/音声抽出）
- ✅ 正しい due 日付計算（コレクション作成日基準）

### Phase 5: パフォーマンス最適化

- ✅ N+1 問題解消（デッキ統計を一括取得）
- ✅ ページネーション実装（カード一覧 20 件/ページ）
- ✅ 階層デッキの統計を自動集計（子デッキ含む）
- ✅ 不要な API コール削減（100 回 → 1 回）

### Phase 6: タグシステム（完全実装済み）

- ✅ タグ CRUD API (`POST/GET/PUT/DELETE /api/tags/*`)
- ✅ カードタグ関連 API (`POST/DELETE /api/cards/:id/tags`)
- ✅ タグでカード検索 (`GET /api/tags/:id/cards`)
- ✅ タグ UI 実装（`/dashboard/tags`）
  - タグ作成・編集・削除
  - インライン編集
  - 空状態ハンドリング

### Phase 7: 検索機能（完全実装済み）

- ✅ 検索 API (`GET /api/search`)
- ✅ 全文検索（front/back フィールド）
- ✅ フィルタリング（デッキ、状態）
- ✅ 検索 UI 実装（`/dashboard/search`）
  - キーワード検索
  - 結果カード表示（デッキ名、状態バッジ）
  - デッキへのナビゲーション

### Phase 8: メディアファイル対応（完全実装済み）

- ✅ .apkg からメディアファイル（画像/音声）抽出
- ✅ `/public/media/` ディレクトリに保存
- ✅ メディア参照の自動処理
- ✅ インポート API でのメディアサポート

### Phase 9: Better Auth 統合（完全実装済み）

- ✅ Better Auth セットアップ（`/lib/auth.ts`）
- ✅ Drizzle Adapter 統合（SQLite）
- ✅ Email/Password プロバイダー設定
- ✅ Better Auth API ルート（`/api/auth/[[...all]]/route.ts`）
- ✅ クライアント SDK（`/lib/auth-client.ts`）
- ✅ データベーススキーマ更新
  - users テーブル（Better Auth 互換）
  - sessions テーブル
  - accounts テーブル
  - verifications テーブル
- ✅ 認証 UI 実装
  - ログインページ（`/login`）
  - サインアップページ（`/signup`）
  - AuthGuard コンポーネント
  - ダッシュボードレイアウトの認証統合

### Bonus: shadcn/ui コンポーネント

- ✅ Button コンポーネント
- ✅ Input コンポーネント
- ✅ Card コンポーネント（Header, Content, Footer）

---

## 現在の実装状況

### データベーススキーマ（Better Auth 対応）

```typescript
// Better Auth テーブル
users {
  id: string (PK)
  name: string
  email: string (unique)
  emailVerified: boolean
  image: string?
  createdAt: timestamp
  updatedAt: timestamp
}

sessions {
  id: string (PK)
  expiresAt: timestamp
  token: string (unique)
  userId: string (FK → users.id)
  ipAddress: string?
  userAgent: string?
  createdAt: timestamp
  updatedAt: timestamp
}

accounts {
  id: string (PK)
  accountId: string
  providerId: string
  userId: string (FK → users.id)
  accessToken: string?
  refreshToken: string?
  password: string?
  createdAt: timestamp
  updatedAt: timestamp
}

verifications {
  id: string (PK)
  identifier: string
  value: string
  expiresAt: timestamp
  createdAt: timestamp
  updatedAt: timestamp
}

// アプリケーションテーブル
decks {
  id: string (PK)
  userId: string (FK → users.id)
  name: string
  description: string?
  parentId: string? (FK → decks.id, CASCADE DELETE)
  deckPath: string (例: "日本史一問一答::02中世::09江戸時代")
  createdAt: timestamp
  updatedAt: timestamp
}

cards {
  id: string (PK)
  deckId: string (FK → decks.id, CASCADE DELETE)
  front: string
  back: string
  // FSRS パラメータ
  due: integer
  stability: real
  difficulty: real
  elapsedDays: integer
  scheduledDays: integer
  reps: integer
  lapses: integer
  state: integer (0: New, 1: Learning, 2: Review, 3: Relearning)
  lastReview: integer?
  createdAt: timestamp
  updatedAt: timestamp
}

tags {
  id: string (PK)
  name: string (unique)
  userId: string (FK → users.id)
}

card_tags {
  cardId: string (FK → cards.id)
  tagId: string (FK → tags.id)
  PRIMARY KEY (cardId, tagId)
}

reviews {
  id: string (PK)
  cardId: string (FK → cards.id, CASCADE DELETE)
  rating: integer
  reviewTime: integer
  state: integer?
  createdAt: timestamp
}
```

### API エンドポイント（完全版）

#### 認証 (Better Auth)

- `POST /api/auth/sign-up/email` - メールでサインアップ
- `POST /api/auth/sign-in/email` - メールでログイン
- `POST /api/auth/sign-out` - ログアウト
- `GET /api/auth/get-session` - セッション取得
- その他 Better Auth エンドポイント

#### デッキ管理

- `GET /api/decks?includeStats=true` - 全デッキ取得（統計込み）
- `GET /api/decks/:id` - デッキ詳細
- `GET /api/decks/:id/stats` - デッキ統計（子デッキ含む）
- `POST /api/decks` - デッキ作成（parentId 対応）
- `PUT /api/decks/:id` - デッキ更新
- `DELETE /api/decks/:id` - デッキ削除（CASCADE）

#### カード管理

- `GET /api/decks/:id/cards?page=1&limit=20&includeChildren=true` - カード一覧
- `GET /api/cards/:id` - カード詳細
- `POST /api/cards` - カード作成
- `PUT /api/cards/:id` - カード更新
- `DELETE /api/cards/:id` - カード削除

#### 学習・復習

- `GET /api/cards/due` - 復習期限のカード取得
- `POST /api/reviews` - 復習結果記録（FSRS アルゴリズム適用）

#### タグ管理

- `GET /api/tags` - タグ一覧取得
- `POST /api/tags` - タグ作成
- `PUT /api/tags/:id` - タグ更新
- `DELETE /api/tags/:id` - タグ削除
- `POST /api/cards/:id/tags` - カードにタグ追加
- `DELETE /api/cards/:id/tags/:tagId` - カードからタグ削除
- `GET /api/cards/:id/tags` - カードのタグ取得
- `GET /api/tags/:id/cards` - タグ別カード取得

#### 検索

- `GET /api/search?q=keyword&deckId=&state=` - カード検索（全文検索、フィルタリング）

#### インポート

- `POST /api/import/apkg` - .apkg ファイルインポート（メディア対応）

#### 統計

- `GET /api/stats/detailed` - 詳細統計（30 日間のレビュー履歴、retention rate など）

---

## 未実装機能（低優先度）

### Phase 10: 数式・コードサポート

```markdown
#### 10.1 数式レンダリング (マジであとでいい)

- [ ] KaTeX 統合（`bun add katex`）
- [ ] LaTeX 記法サポート（`$$...$$`）
- [ ] 数式プレビュー機能

#### 10.2 コードハイライト

- [ ] Prism.js 統合
- [ ] シンタックスハイライト対応
- [ ] コードブロック UI
```

### Phase 11: AI 機能（将来実装）

```markdown
#### 11.1 AI カード生成

- [ ] OpenAI API 統合（gpt-4o-mini）
- [ ] `POST /api/ai/generate-cards` - テキストからカード自動生成
- [ ] AI 生成 UI

#### 11.2 学習最適化

- [ ] 難易度推定 AI
- [ ] おすすめデッキ提案
```

---

## 技術メモ

### Better Auth 統合

```typescript
// サーバー設定 (lib/auth.ts)
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    usePlural: true,
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [nextCookies()],
});

// クライアント SDK (lib/auth-client.ts)
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});

export const { useSession, signIn, signOut, signUp } = authClient;
```

### Drizzle マイグレーション

```bash
# スキーマ変更後
bun db:generate  # マイグレーションファイル生成
bun db:migrate   # マイグレーション実行
bun db:push      # 直接 DB にプッシュ（開発環境のみ）
```

### 階層デッキの扱い

- `deckPath` で階層を管理（例: `"親::子::孫"`）
- デッキ作成時に自動的に `deckPath` を計算
- 統計は `deckPath LIKE 'parent::%'` で子デッキを再帰的に取得
- CASCADE DELETE で親削除時に子も自動削除

### Anki インポート（メディア対応）

- `.apkg` ファイルから SQLite DB とメディアファイルを抽出
- メディアは `/public/media/` に保存
- 正しい due 日付計算:
  - 新規カード (type=0): 即座に利用可能
  - 復習カード (type=2): コレクション作成日 + due 日数
  - 過去の日付: 即座に利用可能に調整

### FSRS 状態管理

```typescript
State.New = 0; // 新規カード
State.Learning = 1; // 学習中
State.Review = 2; // 復習中
State.Relearning = 3; // 再学習中
```

---

## パフォーマンス改善履歴

### 2025-11-09: 大幅な最適化実施

**問題点：**

- デッキ一覧表示時に N+1 問題（100 デッキで 101 回の API コール）
- カード一覧が全件取得（1000 カード一度にレンダリング）
- 不要な UI 要素（サブデッキボタン）

**解決策：**

1. **N+1 削減**: `/api/decks?includeStats=true` で統計を一括計算
2. **ページネーション**: `?page=1&limit=20` でカード取得
3. **階層デッキ自動対応**: `includeChildren=true` をデフォルト化
4. **UI 簡素化**: サブデッキボタン削除、デッキ作成フォームで parentId 指定

**結果：**

- API コール数: 101 回 → 1 回（99% 削減）
- 初回レンダリング時間: 98% 削減
- メモリ使用量: 大幅削減

---

## 開発コマンド

```bash
# 開発サーバー起動
bun dev

# データベースマイグレーション
bun db:generate  # マイグレーション生成
bun db:migrate   # マイグレーション実行

# ビルド
bun run build

# 本番起動
bun run start
```

---

## UI/UX Design Principles

1. **ミニマリスト**: シンプルで洗練されたデザイン
2. **高速**: スムーズなアニメーション、即座のフィードバック
3. **直感的**: 最小限の学習曲線
4. **アクセシブル**: キーボードショートカット、フォーカス管理
5. **レスポンシブ**: モバイル・タブレット・デスクトップ対応

## Key Features

- ✨ モダンな UI/UX
- 🌓 Dark Mode 対応
- 📊 詳細な学習統計
- 🔄 Anki .apkg インポート（メディア対応）
- 🏷️ タグシステム
- �� 全文検索
- 🔐 Better Auth 認証
- 📱 レスポンシブデザイン
- ⚡ 高速パフォーマンス
- 🎯 科学的な間隔反復アルゴリズム (FSRS)

---

**Start Date**: 2025-11-08  
**Current Status**: ✅ Phase 1-9 完了（Phase 10-11 は低優先度）  
**Last Updated**: 2025-11-09
