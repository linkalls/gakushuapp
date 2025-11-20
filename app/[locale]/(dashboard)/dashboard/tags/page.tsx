"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Trash2, Edit2, Plus, Tag } from "lucide-react";

type Tag = {
  id: string;
  name: string;
  user_id: string;
};

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const res = await fetch("/api/tags");
      if (res.ok) {
        const data = await res.json();
        setTags(data);
      }
    } catch (error) {
      console.error("Failed to fetch tags:", error);
    } finally {
      setLoading(false);
    }
  };

  const createTag = async () => {
    if (!newTagName.trim()) return;

    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName.trim() }),
      });

      if (res.ok) {
        setNewTagName("");
        fetchTags();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to create tag");
      }
    } catch (error) {
      console.error("Failed to create tag:", error);
    }
  };

  const updateTag = async (id: string) => {
    if (!editingName.trim()) return;

    try {
      const res = await fetch(`/api/tags/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingName.trim() }),
      });

      if (res.ok) {
        setEditingId(null);
        setEditingName("");
        fetchTags();
      }
    } catch (error) {
      console.error("Failed to update tag:", error);
    }
  };

  const deleteTag = async (id: string) => {
    if (!confirm("このタグを削除しますか?")) return;

    try {
      const res = await fetch(`/api/tags/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchTags();
      }
    } catch (error) {
      console.error("Failed to delete tag:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Tag className="w-8 h-8" />
          タグ管理
        </h1>
        <p className="text-muted-foreground">
          カードを整理するためのタグを管理します
        </p>
      </div>

      {/* 新規タグ作成 */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">新しいタグを作成</h2>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="タグ名を入力..."
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") createTag();
            }}
            className="flex-1"
          />
          <Button onClick={createTag} disabled={!newTagName.trim()}>
            <Plus className="w-4 h-4 mr-2" />
            作成
          </Button>
        </div>
      </Card>

      {/* タグ一覧 */}
      <div className="space-y-3">
        {tags.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <Tag className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>タグがありません</p>
            <p className="text-sm">上のフォームから新しいタグを作成してください</p>
          </Card>
        ) : (
          tags.map((tag) => (
            <Card key={tag.id} className="p-4">
              <div className="flex items-center justify-between">
                {editingId === tag.id ? (
                  <div className="flex gap-2 flex-1">
                    <Input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") updateTag(tag.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                      className="flex-1"
                    />
                    <Button onClick={() => updateTag(tag.id)} size="sm">
                      保存
                    </Button>
                    <Button
                      onClick={() => setEditingId(null)}
                      variant="outline"
                      size="sm"
                    >
                      キャンセル
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <Tag className="w-5 h-5 text-muted-foreground" />
                      <span className="text-lg font-medium">{tag.name}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setEditingId(tag.id);
                          setEditingName(tag.name);
                        }}
                        variant="ghost"
                        size="sm"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => deleteTag(tag.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
