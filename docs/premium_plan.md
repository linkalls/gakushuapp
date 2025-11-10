# GakushuApp プレミアムプラン提案 (v2)

## 1. 概要

GakushuAppの持続的な開発と高度な機能提供のため、「Proプラン」を導入します。「Freeプラン」は引き続き、すべてのユーザーにアプリのコアな学習体験を提供します。

-   **Freeプラン:** 新規ユーザーを対象とし、学習に必要なすべての基本機能を提供します。
-   **Proプラン:** 高度な分析、無制限のAI機能を必要とするパワーユーザーを対象とします。

## 2. 機能比較

| 機能 | Freeプラン | Proプラン |
| :--- | :---: | :---: |
| デッキ作成・学習 | ✅ | ✅ |
| デッキのインポート | ✅ | ✅ |
| 基本的な統計 | ✅ | ✅ |
| 公開ランキング | ✅ | ✅ |
| **高度な学習統計** | - | ✅ |
| **AI分析 (`gpt5-mini`)** | 月5回まで | **無制限** |
| 優先サポート | - | ✅ |
| 広告非表示 | - | ✅ |

## 3. 価格設定

Proプランは、利用しやすいように2つのサブスクリプションオプションを提供します。

| プラン | 月額価格 | 年額価格 |
| :--- | :---: | :---: |
| **Pro** | **$8 / 月** | **$80 / 年** (16%割引) |

## 4. 実装詳細

### 4.1. データベーススキーマの変更

**対象ファイル:** `lib/db/drizzle-schema.ts`

Stripeによるサブスクリプション状態を管理するため、`users`テーブルを更新します。

```typescript
// In lib/db/drizzle-schema.ts
// ...
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").unique().notNull(),
  // ... other columns

  // --- プレミアムプラン用のカラム ---
  plan: text("plan", { enum: ["free", "pro"] }).default("free").notNull(),
  aiUsageCount: integer("ai_usage_count").default(0).notNull(),
  aiUsageResetAt: integer("ai_usage_reset_at").default(sql`(unixepoch())`).notNull(),
  
  // --- Stripe連携用の新規カラム ---
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeSubscriptionStatus: text("stripe_subscription_status"),
  stripeCurrentPeriodEnd: integer("stripe_current_period_end"), // サブスクリプション期間の終了日 (Unixタイムスタンプ)
});
// ...
```

**マイグレーションコマンド:** `bun run db:generate`

### 4.2. 決済連携 (Stripe)

支払とサブスクリプション管理のためにStripeを導入します。

1.  **Stripeライブラリのインストール:**
    ```bash
    bun add stripe
    ```

2.  **Stripeチェックアウト用エンドポイントの作成:**
    *   **ファイル:** `app/api/[[...route]]/route.ts`
    *   **エンドポイント:** `POST /api/stripe/create-checkout-session`
    *   **ロジック:**
        *   `auth.protect()` で認証。
        *   ユーザーの `stripeCustomerId` を検索または新規作成。
        *   選択された価格ID（月額/年額）でStripeチェックアウトセッションを作成。
        *   フロントエンドからのリダイレクト用にセッションURLを返す。

3.  **Stripe Webhook用エンドポイントの作成:**
    *   **ファイル:** `app/api/webhooks/stripe/route.ts` (新規ファイル)
    *   **ロジック:**
        *   Stripeイベントをリッスンします。主要なイベントは以下の通りです。
            *   `checkout.session.completed`: ユーザーが正常にサブスクリプションを完了した時。ユーザーの `plan` を `'pro'` に更新し、`stripeSubscriptionId` と `stripeSubscriptionStatus` を保存します。
            *   `customer.subscription.updated`, `customer.subscription.deleted`: サブスクリプションの状態が変更された時（キャンセル、支払い失敗など）。ユーザーの `plan` と `stripeSubscriptionStatus` を適宜更新します。
        *   このエンドポイントはStripeのWebhook署名を検証して保護する必要があります。

### 4.3. APIとミドルウェアの更新

1.  **ミドルウェア (`middleware.ts`):**
    *   以前定義したミドルウェアは引き続き有効です。`user.plan` をチェックし、Pro以外のユーザーを `/dashboard/stats` のような保護されたページからリダイレクトします。

2.  **APIエンドポイント (`app/api/[[...route]]/route.ts`):**
    *   **AIエンドポイント (`/api/ai/generate`):** `user.plan` と `user.aiUsageCount` をチェックするロジックは正しいです。AI生成ロジックは `gpt5-mini` モデルを呼び出すようにします。
    *   **データ共有エンドポイント (`/api/decks/:id/share`):** `user.plan` をチェックし、`'free'` ユーザーの共有を制限するロジックは正しいです。

### 4.4. UI/UXの変更

1.  **支払いページ (`/dashboard/billing/page.tsx`):**
    *   月額および年額のProプランオプションを明確に表示します。
    *   各オプションには「アップグレード」ボタンを設置し、`POST /api/stripe/create-checkout-session` エンドポイントを呼び出してユーザーをStripeチェックアウトページにリダイレクトします。
    *   既存のProユーザー向けに「サブスクリプション管理」ボタンを追加し、Stripeビリングポータルセッションを作成してサブスクリプションを管理できるようにします。
