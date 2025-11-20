"use client";

import { signIn, signUp, useSession } from "@/lib/auth-client";
import { useEffect, useState } from "react";

// This component is for ANONYMOUS users to link their account
const LinkAccountSection = ({ handleSocialLink, isLoading, error }: {
  handleSocialLink: (provider: 'google' | 'github' | 'line') => Promise<void>;
  isLoading: string | null;
  error: string | null;
}) => {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleEmailLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setEmailError(null);
    try {
      const result = await signUp.email({ name, email, password });
      if (result?.error) {
        const err = result.error;
        const message = typeof err === 'string' ? err : err?.message ?? JSON.stringify(err);
        throw new Error(message);
      }
      // Success will trigger a page reload/redirect
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "予期せぬエラーが発生しました。");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-6 rounded-r-lg space-y-6">
      <h3 className="text-xl font-bold text-yellow-800 dark:text-yellow-200">
        アカウントを本登録する
      </h3>
      <p className="text-yellow-700 dark:text-yellow-300">
        学習データを安全に引き継ぐために、アカウントの本登録をおすすめします。
      </p>

      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
      {emailError && <p className="text-sm text-red-500 text-center">{emailError}</p>}

      {/* Email/Password Form */}
      <form onSubmit={handleEmailLink} className="space-y-4">
        <div>
          <label htmlFor="name-link" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">表示名</label>
          <input
            type="text"
            id="name-link"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            placeholder="表示名"
            required
          />
        </div>
        <div>
          <label htmlFor="email-link" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">メールアドレス</label>
          <input
            type="email"
            id="email-link"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            placeholder="user@example.com"
            required
          />
        </div>
        <div>
          <label htmlFor="password-link" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">パスワード</label>
          <input
            type="password"
            id="password-link"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            placeholder="••••••••"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting || !!isLoading}
          className="w-full px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 rounded-lg font-medium hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? '登録中...' : 'メールアドレスで登録'}
        </button>
      </form>

      <div className="relative flex py-2 items-center">
        <div className="grow border-t border-zinc-300 dark:border-zinc-700"></div>
        <span className="shrink mx-4 text-zinc-500 dark:text-zinc-400 text-sm">または</span>
        <div className="grow border-t border-zinc-300 dark:border-zinc-700"></div>
      </div>

      {/* Social Logins */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => handleSocialLink('google')}
          disabled={!!isLoading || isSubmitting}
          className="flex-1 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 rounded-lg font-medium hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading === 'google' ? '処理中...' : 'Googleで登録'}
        </button>
        {/*
        <button 
          onClick={() => handleSocialLink('github')} 
          disabled={!!isLoading || isSubmitting} 
          className="flex-1 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 rounded-lg font-medium hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading === 'github' ? '処理中...' : 'GitHubで登録'}
        </button>
        */}
        <button
          onClick={() => handleSocialLink('line')}
          disabled={!!isLoading || isSubmitting}
          className="flex-1 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 rounded-lg font-medium hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading === 'line' ? '処理中...' : 'LINEで登録'}
        </button>
      </div>
    </div>
  );
};

// This component is for REGISTERED users to link social accounts
const ConnectedAccountsSection = ({ user, handleSocialLink, isLoading, error }: {
  user: any; // Using `any` for now, but should be the augmented User type
  handleSocialLink: (provider: 'google' | 'github' | 'line') => Promise<void>;
  isLoading: string | null;
  error: string | null;
}) => {
  const availableProviders = [
    { id: 'google', name: 'Google' },
    // { id: 'github', name: 'GitHub' }, // Commented out per request
    { id: 'line', name: 'LINE' },
  ];

  const linkedProviders = user.linkedProviders || [];

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-200">
        連携アカウント
      </h3>
      <p className="text-zinc-600 dark:text-zinc-400">
        他のサービスと連携して、ログインを簡単にします。
      </p>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="space-y-3 pt-2">
        {availableProviders.map(provider => {
          const isLinked = linkedProviders.includes(provider.id);
          return (
            <div key={provider.id} className="flex items-center justify-between">
              <span className="font-medium text-zinc-800 dark:text-zinc-200">{provider.name}</span>
              {isLinked ? (
                <span className="text-sm font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 px-3 py-1 rounded-full">連携済み</span>
              ) : (
                <button
                  onClick={() => handleSocialLink(provider.id as 'google' | 'line')}
                  disabled={!!isLoading}
                  className="px-4 py-1.5 border-2 border-zinc-300 dark:border-zinc-700 rounded-lg font-medium text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading === provider.id ? '処理中...' : '連携'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ProfileUpdateForm = ({ user, name, setName, handleUpdateProfile, isUpdating, updateError, success }: {
  user: any;
  name: string;
  setName: (name: string) => void;
  handleUpdateProfile: () => void;
  isUpdating: boolean;
  updateError: string | null;
  success: string | null;
}) => {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-8 space-y-6">
      <div className="flex items-center gap-6">
        <img
          src={user.image || `https://avatar.vercel.sh/${user.id}.svg`}
          alt={user.name || "User avatar"}
          className="w-24 h-24 rounded-full"
        />
        <div>
          <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-200">
            {user.name || 'Anonymous User'}
          </h2>
          <p className="text-zinc-500 dark:text-zinc-500">{user.email}</p>
        </div>
      </div>

      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
        >
          表示名
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
          placeholder="表示名"
          disabled={isUpdating}
        />
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
        >
          メールアドレス
        </label>
        <input
          type="email"
          id="email"
          defaultValue={user.email || ""}
          disabled
          className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
        />
      </div>

      {updateError && <p className="text-sm text-red-500">{updateError}</p>}
      {success && <p className="text-sm text-green-500">{success}</p>}

      <div className="flex justify-end">
        <button
          onClick={handleUpdateProfile}
          className="px-6 py-2 bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 rounded-lg font-medium hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isUpdating || name === user.name || !name.trim()}
        >
          {isUpdating ? "更新中..." : "更新"}
        </button>
      </div>
    </div>
  );
};


export default function ProfilePage() {
  const { data: session, isPending } = useSession();
  const [name, setName] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // State for account linking
  const [isLinking, setIsLinking] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.name) {
      setName(session.user.name);
    }
  }, [session?.user?.name]);

  const handleSocialLink = async (provider: 'google' | 'github' | 'line') => {
    setIsLinking(provider);
    setLinkError(null);
    try {
      const result = await signIn.social({ provider });
      if (result?.error) {
        const err = result.error;
        const message = typeof err === 'string' ? err : err?.message ?? JSON.stringify(err);
        throw new Error(message);
      }
      // On success, better-auth should handle the redirect/reload
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : "予期せぬエラーが発生しました。");
      setIsLinking(null);
    }
  };

  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      setUpdateError("表示名を入力してください。");
      return;
    }
    if (name === session?.user?.name) {
      return;
    }

    setIsUpdating(true);
    setUpdateError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "プロフィールの更新に失敗しました。");
      }

      setSuccess("プロフィールが正常に更新されました。");
      window.location.reload();

    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : "予期せぬエラーが発生しました。");
    } finally {
      setIsUpdating(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-zinc-600 dark:text-zinc-400">読み込み中...</div>
      </div>
    );
  }

  if (status === "unauthenticated" || !session?.user) {
    return (
      <div className="text-center py-12">
        <div className="text-zinc-600 dark:text-zinc-400">
          ログインしてください
        </div>
      </div>
    );
  }

  const { user } = session;

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          プロフィール
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-2">
          アカウント情報を管理します
        </p>
      </div>

      {user.isAnonymous && (
        <LinkAccountSection
          handleSocialLink={handleSocialLink}
          isLoading={isLinking}
          error={linkError}
        />
      )}

      <ProfileUpdateForm
        user={user}
        name={name}
        setName={setName}
        handleUpdateProfile={handleUpdateProfile}
        isUpdating={isUpdating}
        updateError={updateError}
        success={success}
      />

      {!user.isAnonymous && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-8">
          <ConnectedAccountsSection
            user={user}
            handleSocialLink={handleSocialLink}
            isLoading={isLinking}
            error={linkError}
          />
        </div>
      )}
    </div>
  );
}