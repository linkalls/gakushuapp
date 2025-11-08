"use client";

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import { useEffect, useState } from "react";
import { Bar, Line, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ReviewLog {
  id: string;
  cardId: string;
  rating: number;
  reviewTime: number;
  state?: number;
  createdAt: number;
}

interface Card {
  id: string;
  state: number;
  due: number;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
}

export default function StatsPage() {
  const [reviews, setReviews] = useState<ReviewLog[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/stats/detailed").then((r) => r.json()),
      // Fetch all cards for deck stats
      fetch("/api/stats").then((r) => r.json()),
    ])
      .then(([detailedData, statsData]) => {
        // detailedData contains reviews array
        setReviews(detailedData.reviews || []);
        setCards(statsData.cards || []);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to fetch stats:", error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-zinc-600 dark:text-zinc-400">読み込み中...</div>
      </div>
    );
  }

  // Calculate stats
  const now = Date.now();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTimestamp = today.getTime();

  // Today's reviews
  const todayReviews = reviews.filter((r) => r.createdAt >= todayTimestamp);
  const againCount = todayReviews.filter((r) => r.rating === 1).length;
  const correctPercentage =
    todayReviews.length > 0
      ? Math.round(
        ((todayReviews.length - againCount) / todayReviews.length) * 100
      )
      : 0;

  // Reviews by type (state might be undefined for old reviews)
  const learnReviews = todayReviews.filter((r) => r.state === 1).length;
  const reviewReviews = todayReviews.filter((r) => r.state === 2).length;
  const relearnReviews = todayReviews.filter((r) => r.state === 3).length;

  // Card counts by state
  const newCards = cards.filter((c) => c.state === 0).length;
  const learningCards = cards.filter((c) => c.state === 1).length;

  // For young/mature cards, handle stability=0 cases
  const reviewStateCards = cards.filter((c) => c.state === 2);
  const youngCards = reviewStateCards.filter(
    (c) => c.stability > 0 && c.stability < 21
  ).length;
  const matureCards = reviewStateCards.filter(
    (c) => c.stability >= 21
  ).length;
  // Cards with stability=0 in review state (shouldn't happen but handle gracefully)
  const unstableReviewCards = reviewStateCards.filter((c) => c.stability === 0).length;

  // Reviews over last 30 days
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const last30Days: { [date: string]: number } = {};
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split("T")[0];
    last30Days[dateStr] = 0;
  }

  reviews
    .filter((r) => r.createdAt >= thirtyDaysAgo)
    .forEach((r) => {
      const date = new Date(r.createdAt).toISOString().split("T")[0];
      if (last30Days[date] !== undefined) {
        last30Days[date]++;
      }
    });

  // Daily reviews chart data
  const reviewChartData = {
    labels: Object.keys(last30Days).map((d) => {
      const date = new Date(d);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }),
    datasets: [
      {
        label: "復習数",
        data: Object.values(last30Days),
        backgroundColor: "rgba(24, 24, 27, 0.8)",
        borderColor: "rgba(24, 24, 27, 1)",
        borderWidth: 1,
      },
    ],
  };

  // Card states pie chart
  const cardStateData = {
    labels: unstableReviewCards > 0
      ? ["新規", "学習中", "若い", "成熟", "不安定"]
      : ["新規", "学習中", "若い", "成熟"],
    datasets: [
      {
        data: unstableReviewCards > 0
          ? [newCards, learningCards, youngCards, matureCards, unstableReviewCards]
          : [newCards, learningCards, youngCards, matureCards],
        backgroundColor: unstableReviewCards > 0
          ? [
            "rgba(59, 130, 246, 0.8)", // Blue - New
            "rgba(239, 68, 68, 0.8)", // Red - Learning
            "rgba(34, 197, 94, 0.8)", // Green - Young
            "rgba(99, 102, 241, 0.8)", // Indigo - Mature
            "rgba(161, 161, 170, 0.8)", // Gray - Unstable
          ]
          : [
            "rgba(59, 130, 246, 0.8)", // Blue - New
            "rgba(239, 68, 68, 0.8)", // Red - Learning
            "rgba(34, 197, 94, 0.8)", // Green - Young
            "rgba(99, 102, 241, 0.8)", // Indigo - Mature
          ],
        borderColor: unstableReviewCards > 0
          ? [
            "rgba(59, 130, 246, 1)",
            "rgba(239, 68, 68, 1)",
            "rgba(34, 197, 94, 1)",
            "rgba(99, 102, 241, 1)",
            "rgba(161, 161, 170, 1)",
          ]
          : [
            "rgba(59, 130, 246, 1)",
            "rgba(239, 68, 68, 1)",
            "rgba(34, 197, 94, 1)",
            "rgba(99, 102, 241, 1)",
          ],
        borderWidth: 2,
      },
    ],
  };

  // Answer buttons distribution (last 30 days)
  const buttonCounts = { again: 0, hard: 0, good: 0, easy: 0 };
  reviews
    .filter((r) => r.createdAt >= thirtyDaysAgo)
    .forEach((r) => {
      switch (r.rating) {
        case 1:
          buttonCounts.again++;
          break;
        case 2:
          buttonCounts.hard++;
          break;
        case 3:
          buttonCounts.good++;
          break;
        case 4:
          buttonCounts.easy++;
          break;
      }
    });

  const buttonData = {
    labels: ["もう一度", "難しい", "普通", "簡単"],
    datasets: [
      {
        label: "回答数",
        data: [
          buttonCounts.again,
          buttonCounts.hard,
          buttonCounts.good,
          buttonCounts.easy,
        ],
        backgroundColor: [
          "rgba(239, 68, 68, 0.8)", // Red - Again
          "rgba(251, 191, 36, 0.8)", // Amber - Hard
          "rgba(34, 197, 94, 0.8)", // Green - Good
          "rgba(59, 130, 246, 0.8)", // Blue - Easy
        ],
      },
    ],
  };

  // Forecast - cards due in next 7 days
  const forecastDays = 7;
  const forecast: { [date: string]: number } = {};
  for (let i = 0; i < forecastDays; i++) {
    const date = new Date(now + i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split("T")[0];
    forecast[dateStr] = 0;
  }

  cards.forEach((c) => {
    // Skip new cards
    if (c.state === 0) return;

    // Validate due date before processing
    if (!c.due || isNaN(c.due) || c.due === null || c.due === undefined) {
      console.warn(`Card ${c.id} has invalid due date:`, c.due);
      return;
    }

    // Check if due is a reasonable timestamp (not too far in past/future)
    const dueTime = typeof c.due === 'number' ? c.due : new Date(c.due).getTime();
    if (isNaN(dueTime)) {
      console.warn(`Card ${c.id} has unparseable due date:`, c.due);
      return;
    }

    // Only include cards due within the forecast window
    const endOfForecast = now + forecastDays * 24 * 60 * 60 * 1000;
    if (dueTime < now || dueTime > endOfForecast) return;

    const dueDate = new Date(dueTime).toISOString().split("T")[0];
    if (forecast[dueDate] !== undefined) {
      forecast[dueDate]++;
    }
  });

  const forecastData = {
    labels: Object.keys(forecast).map((d) => {
      const date = new Date(d);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }),
    datasets: [
      {
        label: "予定復習数",
        data: Object.values(forecast),
        fill: true,
        backgroundColor: "rgba(99, 102, 241, 0.2)",
        borderColor: "rgba(99, 102, 241, 1)",
        tension: 0.4,
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
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          統計
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-2">
          学習の進捗を確認しましょう
        </p>
      </div>

      {/* Today Stats */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-sm border border-zinc-200 dark:border-zinc-800">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-6">
          今日の学習
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div>
            <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              {todayReviews.length}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              復習数
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {correctPercentage}%
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              正解率
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {learnReviews}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              学習
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {reviewReviews}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              復習
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              {relearnReviews}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              再学習
            </div>
          </div>
        </div>
      </div>

      {/* Future Due (Forecast) */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-sm border border-zinc-200 dark:border-zinc-800">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-6">
          今後7日間の復習予定
        </h2>
        <div style={{ height: "300px" }}>
          <Line data={forecastData} options={chartOptions} />
        </div>
      </div>

      {/* Reviews (Last 30 days) */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-sm border border-zinc-200 dark:border-zinc-800">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-6">
          過去30日間の復習数
        </h2>
        <div style={{ height: "300px" }}>
          <Bar data={reviewChartData} options={chartOptions} />
        </div>
      </div>

      {/* Card States */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-sm border border-zinc-200 dark:border-zinc-800">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-6">
          カードの状態
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div style={{ height: "300px" }} className="flex items-center justify-center">
            <Pie
              data={cardStateData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: "right",
                  },
                },
              }}
            />
          </div>
          <div className="flex flex-col justify-center space-y-4">
            <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
              <span className="text-zinc-700 dark:text-zinc-300">新規</span>
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {newCards}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
              <span className="text-zinc-700 dark:text-zinc-300">学習中</span>
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {learningCards}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
              <span className="text-zinc-700 dark:text-zinc-300">
                若い (&lt;21日)
              </span>
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {youngCards}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
              <span className="text-zinc-700 dark:text-zinc-300">
                成熟 (≥21日)
              </span>
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {matureCards}
              </span>
            </div>
            {unstableReviewCards > 0 && (
              <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                <span className="text-amber-700 dark:text-amber-300">
                  不安定 (要修正)
                </span>
                <span className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                  {unstableReviewCards}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Answer Buttons */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-sm border border-zinc-200 dark:border-zinc-800">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-6">
          回答ボタンの分布（過去30日間）
        </h2>
        <div style={{ height: "300px" }}>
          <Bar data={buttonData} options={chartOptions} />
        </div>
        <div className="mt-6 grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {buttonCounts.again}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              もう一度
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {buttonCounts.hard}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              難しい
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {buttonCounts.good}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              普通
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {buttonCounts.easy}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              簡単
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
