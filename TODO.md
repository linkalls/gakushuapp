# Drizzle ORM 完全移行計画

## 進捗状況

- [x] 1. Auth API (signup/login) → Drizzle ✅
- [x] 2. Decks API (CRUD + stats) → Drizzle ✅
- [x] 3. Cards API (CRUD + pagination) → Drizzle ✅
- [x] 4. Reviews API (submit + FSRS) → Drizzle ✅
- [x] 5. Stats API (analytics) → Drizzle ✅
- [x] 6. Tags API (CRUD + associations) → Drizzle ✅
- [x] 7. Import APKG API → Drizzle ✅
- [ ] 8. 全エンドポイントのテスト
- [ ] 9. 古い database.ts 削除

## ✨ 完了した変換

すべての API が Drizzle ORM に完全移行されました!

### 変換された API 一覧:

1. **Auth API** - Bun.password + Drizzle
2. **Decks API** - 階層構造、統計計算
3. **Cards API** - CRUD、ページネーション、due cards
4. **Reviews API** - FSRS 統合、レビュー記録
5. **Stats API** - 詳細な統計データ
6. **Tags API** - タグ管理
7. **Import APKG API** - Anki 形式インポート
8. **Card-Tags API** - カードとタグの関連付け

### 使用した Drizzle 機能:

- ✅ `select()`, `insert()`, `update()`, `delete()`
- ✅ `where()`, `eq()`, `and()`, `or()`, `like()`, `inArray()`
- ✅ `gte()`, `lte()`, `sql()`
- ✅ `innerJoin()` - 複数テーブル結合
- ✅ `count()`, `sum()` - 集計関数
- ✅ `orderBy()`, `desc()` - ソート
- ✅ `limit()`, `offset()` - ページネーション
- ✅ `groupBy()` - グループ化

## 実装パターン

### SELECT

```typescript
const user = await db.select().from(users).where(eq(users.email, email)).get();
```

### INSERT

```typescript
await db.insert(decks).values({
  id: generateId(),
  user_id: userId,
  name: body.name,
  created_at: now(),
  updated_at: now(),
});
```

### UPDATE

```typescript
await db
  .update(decks)
  .set({ name: body.name, updated_at: now() })
  .where(eq(decks.id, id));
```

### DELETE

```typescript
await db.delete(decks).where(eq(decks.id, id));
```

### COUNT

```typescript
const result = await db
  .select({ count: count() })
  .from(cards)
  .where(eq(cards.deck_id, deckId))
  .get();
```

### JOIN

```typescript
const reviews = await db
  .select()
  .from(reviews)
  .innerJoin(cards, eq(reviews.card_id, cards.id))
  .innerJoin(decks, eq(cards.deck_id, decks.id))
  .where(eq(decks.user_id, userId));
```

```

## 最近の更新

- [x] クリーンアップ用スクリプトを作成 — 完了 (2025-11-13)
```
