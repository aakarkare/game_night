'use client';

import { useEffect, useMemo, useState } from 'react';
import boardData from '../../public/data/jeopardy.json';
import { awardPlayerPoints, listenToRoomPlayers, type PlayerScore } from '../lib/firebase';

type Clue = {
  id: string;
  value: number;
  question: string;
  answer: string;
  isRevealed: boolean;
};

type Category = {
  category: string;
  clues: Clue[];
};

type JeopardyBoardProps = {
  roomCode?: string;
};

const categories = boardData as Category[];

export default function JeopardyBoard({ roomCode }: JeopardyBoardProps) {
  const [players, setPlayers] = useState<PlayerScore[]>([]);
  const [selectedClue, setSelectedClue] = useState<{ categoryIndex: number; clueIndex: number; clue: Clue } | null>(null);
  const [board, setBoard] = useState<Category[]>(categories);

  useEffect(() => {
    if (!roomCode) {
      setPlayers([]);
      return;
    }

    const unsubscribe = listenToRoomPlayers(roomCode, setPlayers);
    return () => unsubscribe();
  }, [roomCode]);

  const currentClue = useMemo(() => selectedClue?.clue ?? null, [selectedClue]);

  const updateTileState = (categoryIndex: number, clueIndex: number) => {
    setBoard((previousBoard) =>
      previousBoard.map((category, idx) =>
        idx !== categoryIndex
          ? category
          : {
              ...category,
              clues: category.clues.map((clue, cluePosition) =>
                cluePosition === clueIndex ? { ...clue, isRevealed: true } : clue,
              ),
            },
      ),
    );
  };

  const handleTileClick = (categoryIndex: number, clueIndex: number) => {
    const clue = board[categoryIndex].clues[clueIndex];
    if (clue.isRevealed) return;

    setSelectedClue({ categoryIndex, clueIndex, clue });
  };

  const handleScore = async (playerId: string, delta: number) => {
    if (!roomCode) return;
    await awardPlayerPoints(roomCode, playerId, delta);
  };

  const closeClue = () => {
    if (!selectedClue) return;
    updateTileState(selectedClue.categoryIndex, selectedClue.clueIndex);
    setSelectedClue(null);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-900">Jeopardy Board</h2>
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Room {roomCode ?? 'N/A'}</span>
        </div>

        <div className="grid gap-3 lg:grid-cols-5">
          {board.map((category, categoryIndex) => (
            <div key={category.category} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-3 text-center text-sm font-bold uppercase tracking-[0.12em] text-slate-700">
                {category.category}
              </div>
              <div className="space-y-2">
                {category.clues.map((clue, clueIndex) => (
                  <button
                    key={clue.id}
                    type="button"
                    onClick={() => handleTileClick(categoryIndex, clueIndex)}
                    disabled={clue.isRevealed}
                    className={`flex h-14 w-full items-center justify-center rounded-lg text-lg font-black transition ${
                      clue.isRevealed
                        ? 'cursor-not-allowed bg-slate-300 text-slate-500'
                        : 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm hover:brightness-105'
                    }`}
                  >
                    ${clue.value}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedClue && currentClue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Clue</div>
                <div className="mt-1 text-3xl font-black text-slate-900">${currentClue.value}</div>
              </div>
              <button
                type="button"
                onClick={closeClue}
                className="rounded-full border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700"
              >
                Close
              </button>
            </div>

            <div className="rounded-2xl bg-slate-100 p-5 text-xl font-medium text-slate-800">
              {currentClue.question}
            </div>

            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-lg text-emerald-800">
              <span className="font-bold">Answer:</span> {currentClue.answer}
            </div>

            <div className="mt-6">
              <div className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Assign points</div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {players.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-500">
                    No players in this room yet.
                  </div>
                ) : (
                  players.map((player) => (
                    <div key={player.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{player.name}</span>
                        <span className="text-sm font-bold text-slate-600">{player.score}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            void handleScore(player.id, currentClue.value);
                          }}
                          className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-bold text-white"
                        >
                          +{currentClue.value}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void handleScore(player.id, -currentClue.value);
                          }}
                          className="rounded-md bg-rose-500 px-3 py-2 text-sm font-bold text-white"
                        >
                          -{currentClue.value}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
