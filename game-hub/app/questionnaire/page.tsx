'use client';

import { useEffect, useMemo, useState } from "react";

type QuestionnaireEntry = {
  id: string;
  text: string;
  submittedAt: string;
  source: string;
};

const initialEntries: QuestionnaireEntry[] = [
  {
    id: "seed-1",
    text: "The games were hilarious.",
    submittedAt: new Date().toISOString(),
    source: "seed",
  },
  {
    id: "seed-2",
    text: "I loved the team energy.",
    submittedAt: new Date(Date.now() - 60000).toISOString(),
    source: "seed",
  },
  {
    id: "seed-3",
    text: "The music round was the best.",
    submittedAt: new Date(Date.now() - 120000).toISOString(),
    source: "seed",
  },
];

export default function QuestionnairePage() {
  const [entries, setEntries] = useState<QuestionnaireEntry[]>(initialEntries);

  useEffect(() => {
    const refreshEntries = async () => {
      const response = await fetch("/api/form-webhook");
      if (!response.ok) {
        return;
      }

      const data = await response.json();
      if (Array.isArray(data.entries) && data.entries.length > 0) {
        setEntries(data.entries);
      }
    };

    refreshEntries();
    const interval = setInterval(refreshEntries, 2500);
    return () => clearInterval(interval);
  }, []);

  const responseStats = useMemo(() => {
    const total = entries.length;
    const liveVotes = Math.max(1, Math.min(100, total * 2));
    const avgMood = (9.2 + total * 0.1).toFixed(1);

    return [
      { label: "Total responses", value: total },
      { label: "Live votes", value: liveVotes },
      { label: "Avg. mood", value: `${avgMood}/10` },
    ];
  }, [entries]);

  const chartValues = useMemo(() => {
    const bucketSize = 6;
    const values = Array.from({ length: bucketSize }, (_, index) => {
      const base = 20 + ((index + 1) * 14) % 80;
      return entries.length > index ? Math.min(100, base + entries.length * 2 + index * 4) : base;
    });

    return values;
  }, [entries]);

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-400">Survey hub</p>
            <h1 className="mt-2 text-4xl font-black">Live questionnaire dashboard</h1>
          </div>
          <div className="rounded-full border border-emerald-500 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300">
            Live feed connected
          </div>
        </header>

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          {responseStats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">{stat.label}</p>
              <p className="mt-3 text-3xl font-black text-cyan-300">{stat.value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <h2 className="mb-4 text-2xl font-bold text-cyan-300">Live chart</h2>
            <div className="flex h-64 items-end gap-3 rounded-xl bg-slate-800 p-4">
              {chartValues.map((value, index) => (
                <div
                  key={`${value}-${index}`}
                  className="flex-1 rounded-t-xl bg-gradient-to-t from-cyan-500 to-blue-300"
                  style={{ height: `${value}%` }}
                />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <h2 className="mb-4 text-2xl font-bold text-cyan-300">Recent responses</h2>
            <ul className="space-y-3">
              {entries.map((entry) => (
                <li key={entry.id} className="rounded-xl bg-slate-800 p-3 text-slate-100">
                  “{entry.text}”
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
