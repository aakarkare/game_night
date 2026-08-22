"use client";

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import JeopardyBoard from '../../components/JeopardyBoard';
import TriviaHost from '../../components/TriviaHost';
import { listenToRoomPlayers, type PlayerScore } from '../../lib/firebase';

function HostPageContent() {
  const searchParams = useSearchParams();
  const roomCode = searchParams?.get('roomCode') ?? 'UNKNOWN';
  const [tab, setTab] = useState<'jeopardy' | 'trivia'>('jeopardy');
  const [players, setPlayers] = useState<PlayerScore[]>([]);

  useEffect(() => {
    if (!roomCode || roomCode === 'UNKNOWN') {
      setPlayers([]);
      return;
    }

    const unsubscribe = listenToRoomPlayers(roomCode, setPlayers);
    return () => unsubscribe();
  }, [roomCode]);

  return (
    <div className="min-h-screen bg-slate-100 p-4 text-slate-900 md:p-6">
      <header className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">Host view</p>
            <h1 className="mt-1 text-3xl font-black">Game Night Control</h1>
          </div>
          <div className="rounded-xl bg-slate-900 px-4 py-3 text-right text-white">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Room code</div>
            <div className="font-mono text-xl font-bold">{roomCode}</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab('jeopardy')}
            className={`rounded-lg px-4 py-2 font-semibold transition ${
              tab === 'jeopardy' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            Jeopardy
          </button>
          <button
            type="button"
            onClick={() => setTab('trivia')}
            className={`rounded-lg px-4 py-2 font-semibold transition ${
              tab === 'trivia' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            Trivia
          </button>
        </div>
      </header>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Live scores</div>
        <div className="flex flex-wrap gap-2">
          {players.length === 0 ? (
            <div className="text-sm text-slate-500">No players are connected yet.</div>
          ) : (
            players.map((player) => (
              <div key={player.id} className="rounded-lg bg-slate-100 px-3 py-2">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-500">{player.name}</div>
                <div className="text-lg font-black text-slate-900">{player.score}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {tab === 'jeopardy' ? <JeopardyBoard roomCode={roomCode} /> : <TriviaHost roomCode={roomCode} />}
    </div>
  );
}

export default function HostPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-900">Loading host lobby...</main>}>
      <HostPageContent />
    </Suspense>
  );
}
