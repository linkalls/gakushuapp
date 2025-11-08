# Gakushu App - Anki Alternative Development Plan

## Project Overview

Anki の代替となる、モダンでおしゃれ、使いやすい間隔反復学習アプリを構築します。

## Tech Stack

- **Frontend**: Next.js 16 + React 19 + Tailwind CSS 4
- **Backend API**: Hono (API Routes)
- **Database**: Bun:SQLite
- **SRS Algorithm**: ts-fsrs
- **Authentication**: Better Auth
- **Dark Mode**: フル対応

## Development Phases

### Phase 1: 基本構造とセットアップ

- [x] プロジェクト構造の把握
- [x] データベーススキーマ設計
- [x] Hono API ルートのセットアップ
- [x] 基本的な UI 構造の作成
- [x] Dark Mode 対応の設定
- [x] Drizzle ORM 統合
- [x] ts-fsrs のエラー修正
- [x] Dark Mode ホバー問題修正 (zinc-750 → zinc-700)
- [x] Drizzle スクリプトを package.json に追加

### Phase 2: コア機能 - データベース & SRS

- [x] Bun:SQLite のセットアップ
- [x] データモデルの実装
  - [x] Users (Better Auth 連携)
  - [x] Decks (デッキ)
  - [x] Cards (カード)
  - [x] Reviews (復習履歴)
  - [ ] FSRS Parameters (ユーザー別 SRS パラメータ)
- [x] ts-fsrs の統合修正
- [x] 復習スケジューリングロジック
- [x] CRUD API 実装 (Hono)

### Phase 3: 基本 UI 実装

- [x] ホーム画面/ダッシュボード
- [x] デッキ一覧表示
- [x] カード作成・編集画面
- [x] 学習画面 (カード表示・評価)
- [x] 統計画面
- [x] レスポンシブデザイン

### Phase 3.5: 認証システム (簡易版)

- [x] デモユーザーログイン機能
- [x] 認証ガード実装
- [x] ログアウト機能
- [x] ログインページ作成
- [ ] Better Auth への移行 (将来)

### Phase 4: Anki 互換機能 (.apkg)

- [x] .apkg ファイルフォーマットの調査
- [x] .apkg 読み込み機能
  - [x] SQLite DB の解析
  - [x] カード情報の抽出
  - [ ] メディアファイルの処理
- [x] .apkg インポート UI
- [x] データマイグレーション機能

### Phase 5: 高度な機能

- [ ] タグシステム UI 実装
  - [ ] タグ CRUD API
  - [ ] カードへのタグ付け UI
  - [ ] タグフィルタリング機能
- [ ] カード検索機能
  - [ ] 全文検索 API
  - [ ] 検索 UI
- [ ] フィルタリング・ソート
- [ ] カスタムフィールド
- [ ] 画像・音声サポート
  - [ ] .apkg からメディアファイル抽出
  - [ ] メディアファイル保存
  - [ ] カードでのメディア表示
- [ ] LaTeX/数式サポート
  - [ ] KaTeX 統合
  - [ ] 数式レンダリング
- [ ] コードシンタックスハイライト

### Phase 6: 認証とユーザー管理

- [ ] Better Auth のセットアップ
- [ ] サインアップ/ログイン UI
- [ ] ユーザープロフィール
- [ ] データの同期・バックアップ

### Phase 7: AI 機能統合

- [ ] AI プロバイダー選定 (OpenAI gpt-4o-mini) ※課金が必要
- [ ] カード自動生成
  - [ ] テキストからカード生成 API
  - [ ] カード生成 UI
- [ ] 学習コンテンツの解析
- [ ] 難易度推定
- [ ] おすすめデッキ提案

### Phase 8: 最適化とデプロイ

- [ ] パフォーマンス最適化
- [ ] テスト作成
- [ ] ドキュメント整備
- [ ] デプロイ準備

## Database Schema

drizzle つかう

### Users

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

### Decks

```sql
CREATE TABLE decks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Cards

```sql
CREATE TABLE cards (
  id TEXT PRIMARY KEY,
  deck_id TEXT NOT NULL,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  due INTEGER NOT NULL,
  stability REAL NOT NULL DEFAULT 0,
  difficulty REAL NOT NULL DEFAULT 0,
  elapsed_days INTEGER NOT NULL DEFAULT 0,
  scheduled_days INTEGER NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  lapses INTEGER NOT NULL DEFAULT 0,
  state INTEGER NOT NULL DEFAULT 0,
  last_review INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
);
```

### Reviews

```sql
CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  rating INTEGER NOT NULL,
  review_time INTEGER NOT NULL,
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);
```

### Tags

```sql
CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE card_tags (
  card_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (card_id, tag_id),
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
```

## API Routes (Hono)

### Authentication

- POST `/api/auth/signup`
- POST `/api/auth/login`
- POST `/api/auth/logout`
- GET `/api/auth/me`

### Decks

- GET `/api/decks` - 全デッキ取得
- GET `/api/decks/:id` - デッキ詳細
- POST `/api/decks` - デッキ作成
- PUT `/api/decks/:id` - デッキ更新
- DELETE `/api/decks/:id` - デッキ削除

### Cards

- GET `/api/decks/:deckId/cards` - デッキのカード一覧
- GET `/api/cards/:id` - カード詳細
- POST `/api/cards` - カード作成
- PUT `/api/cards/:id` - カード更新
- DELETE `/api/cards/:id` - カード削除
- GET `/api/cards/due` - 復習予定カード取得

### Reviews

- POST `/api/reviews` - 復習記録
- GET `/api/stats` - 学習統計

### Import

- POST `/api/import/apkg` - .apkg ファイルインポート

## UI/UX Design Principles

1. **ミニマリスト**: シンプルで洗練されたデザイン
2. **高速**: スムーズなアニメーション、即座のフィードバック
3. **直感的**: 最小限の学習曲線
4. **アクセシブル**: キーボードショートカット、フォーカス管理
5. **レスポンシブ**: モバイル・タブレット・デスクトップ対応

## Key Features

- ✨ モダンな UI/UX
- 🌓 Dark Mode 対応(選択時にしろいろになって背景とどうかするのを解消)
- 📊 詳細な学習統計
- 🔄 Anki .apkg インポート
- 🤖 AI 機能 (将来実装)
- 📱 レスポンシブデザイン
- ⚡ 高速パフォーマンス
- 🎯 科学的な間隔反復アルゴリズム (FSRS)

## Next Steps

1. データベースセットアップ
2. Hono API Routes の構築
3. 基本的な CRUD 機能の実装
4. UI/UX の構築

---

**Start Date**: 2025-11-08
**Status**: In Development
