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

interface StudySession {
  id: string;
  userId: string;
  deckId: string;
  duration: number; // in seconds
  cardsReviewed: number;
  createdAt: string;
}

export function StudySessionStats() {
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/study-sessions")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch study sessions");
        }
        return res.json();
      })
      .then((data) => {
        setStudySessions(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to fetch stats:", error);
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

  const totalDuration = studySessions.reduce(
    (acc, session) => acc + session.duration,
    0
  );
  const totalCardsReviewed = studySessions.reduce(
    (acc, session) => acc + session.cardsReviewed,
    0
  );
  const totalSessions = studySessions.length;

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}時間 ${minutes}分`;
  };

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0); // Reset to start of day

  // Initialize last 30 days with 0 values
  const last30Days: { [date: string]: number } = {};
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0); // Reset to start of day
    const dateStr = date.toISOString().split("T")[0];
    last30Days[dateStr] = 0;
  }

  // Accumulate study durations by date
  studySessions
    .filter((s) => new Date(s.createdAt) >= thirtyDaysAgo)
    .forEach((s) => {
      const sessionDate = new Date(s.createdAt);
      // Use local date to avoid timezone issues
      const year = sessionDate.getFullYear();
      const month = String(sessionDate.getMonth() + 1).padStart(2, '0');
      const day = String(sessionDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      if (last30Days[dateStr] !== undefined) {
        last30Days[dateStr] += s.duration;
      }
    });

  const studyChartData = {
    labels: Object.keys(last30Days).map((d) => {
      const date = new Date(d);
      return `${date.getMonth() + 1}/${date.getDate()}`;
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
