"use client";

import { AuthGuard } from "@/components/auth-guard";
import { signOut, useSession } from "@/lib/auth-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { User as UserIcon } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: session } = useSession();

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-8">
                <Link
                  href="/dashboard"
                  className="text-xl font-bold text-zinc-900 dark:text-zinc-100"
                >
                  Gakushu
                </Link>
                <div className="hidden md:flex gap-6">
                  <Link
                    href="/dashboard"
                    className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                  >
                    ダッシュボード
                  </Link>
                  <Link
                    href="/dashboard/decks"
                    className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                  >
                    デッキ
                  </Link>
                  <Link
                    href="/dashboard/ranking"
                    className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                  >
                    ランキング
                  </Link>
                  <Link
                    href="/dashboard/tags"
                    className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                  >
                    タグ
                  </Link>
                  <Link
                    href="/dashboard/search"
                    className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                  >
                    検索
                  </Link>
                  <Link
                    href="/dashboard/stats"
                    className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                  >
                    統計
                  </Link>
                  <Link
                    href="/dashboard/import"
                    className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                  >
                    インポート
                  </Link>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2"
                    >
                      {session?.user?.image ? (
                        <img
                          src={session.user.image}
                          alt="User avatar"
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <UserIcon className="w-5 h-5" />
                      )}
                      <span className="hidden sm:inline">
                        {session?.user?.name}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>マイアカウント</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
                      プロフィール
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/dashboard/billing')}>
                      課金情報
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-500">
                      ログアウト
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
