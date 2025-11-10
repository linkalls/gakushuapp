"use client";

import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from "chart.js";
import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface StudySummary {
  totalDuration: number;
  totalCardsReviewed: number;
  totalSessions: number;
  days: { date: string; duration: number; cardsReviewed: number }[];
}

export function StudySessionStats() {
  const [summary, setSummary] = useState<StudySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/study-sessions/summary")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch study summary");
        }
        return res.json();
      })
      .then((data) => {
        const normalized: StudySummary = {
          totalDuration: Number(data.totalDuration) || 0,
          totalCardsReviewed: Number(data.totalCardsReviewed) || 0,
          totalSessions: Number(data.totalSessions) || 0,
          days: Array.isArray(data.days)
            ? data.days.map((d: any) => ({
              date: String(d.date),
              duration: Number(d.duration) || 0,
              cardsReviewed: Number(d.cardsReviewed) || 0,
            }))
            : [],
        };
        setSummary(normalized);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to fetch study summary:", error);
        setError(error.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-zinc-600 dark:text-zinc-400">学習データを読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  const totalDuration = summary?.totalDuration ?? 0;
  const totalCardsReviewed = summary?.totalCardsReviewed ?? 0;
  const totalSessions = summary?.totalSessions ?? 0;

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}時間 ${minutes}分`;
  };

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0); // Reset to start of day

  // Initialize last 30 days with 0 values (ローカル日付キー YYYY-MM-DD)
  const last30Days: { [date: string]: number } = {};
  const toLocalDateKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0); // Reset to start of day
    const dateStr = toLocalDateKey(date);
    last30Days[dateStr] = 0;
  }

  // Accumulate study durations by date
  if (summary) {
    summary.days.forEach((d) => {
      if (last30Days[d.date] !== undefined) {
        last30Days[d.date] = d.duration; // server-side aggregation already sums
      }
    });
  }

  const studyChartData = {
    labels: Object.keys(last30Days).map((d) => {
      const [y, m, dd] = d.split("-");
      return `${Number(m)}/${Number(dd)}`;
    }),
    datasets: [
      {
        label: "学習時間 (分)",
        data: Object.values(last30Days).map(d => d / 60),
        backgroundColor: "rgba(24, 24, 27, 0.8)",
        borderColor: "rgba(24, 24, 27, 1)",
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    },
  };

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-sm border border-zinc-200 dark:border-zinc-800">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-6">
          学習セッションのデータ
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              {formatDuration(totalDuration)}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              合計学習時間
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              {totalCardsReviewed}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              合計レビューカード数
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              {totalSessions}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              合計セッション数
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-sm border border-zinc-200 dark:border-zinc-800">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-6">
          過去30日間の学習時間
        </h2>
        <div style={{ height: "300px" }}>
          <Bar data={studyChartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}
