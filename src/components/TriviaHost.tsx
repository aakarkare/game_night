'use client';

import { useEffect, useState } from 'react';
import { awardPlayerPoints, listenToRoomPlayers, listenToTriviaSubmissions, type PlayerScore, type TriviaSubmission } from '../lib/firebase';

type TriviaHostProps = {
  roomCode?: string;
};

export default function TriviaHost({ roomCode }: TriviaHostProps) {
  const [players, setPlayers] = useState<PlayerScore[]>([]);
  const [submissions, setSubmissions] = useState<TriviaSubmission[]>([]);

  useEffect(() => {
    if (!roomCode) {
      setPlayers([]);
      setSubmissions([]);
      return;
    }

    const unsubscribePlayers = listenToRoomPlayers(roomCode, setPlayers);
    const unsubscribeSubmissions = listenToTriviaSubmissions(roomCode, setSubmissions);

    return () => {
      unsubscribePlayers();
      unsubscribeSubmissions();
    };
  }, [roomCode]);

  const handleGrade = async (playerName: string, delta: number) => {
    if (!roomCode) return;
    const playerId = playerName.trim() || 'player';
    await awardPlayerPoints(roomCode, playerId, delta);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 text-xl font-bold text-slate-900">Trivia submissions</div>
        <div className="space-y-3">
          {submissions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              No live trivia answers yet.
            </div>
          ) : (
            submissions.map((submission) => (
              <div key={submission.id ?? `${submission.playerName}-${submission.submittedAt}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="font-semibold text-slate-800">{submission.playerName}</div>
                  <button
                    type="button"
                    onClick={() => {
                      void handleGrade(submission.playerName, 10);
                    }}
                    className="rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-bold text-white"
                  >
                    Grade & Award Points
                  </button>
                </div>
                <div className="text-sm text-slate-600">{submission.answer}</div>
                <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  {new Date(submission.submittedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 text-lg font-bold text-slate-900">Live scores</div>
        <div className="space-y-2">
          {players.length === 0 ? (
            <div className="text-sm text-slate-500">No players have joined this room yet.</div>
          ) : (
            players.map((player) => (
              <div key={player.id} className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2">
                <span className="font-medium text-slate-700">{player.name}</span>
                <span className="text-lg font-black text-slate-900">{player.score}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
