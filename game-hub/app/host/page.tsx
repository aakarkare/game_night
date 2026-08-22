"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ensureRoom, firebaseReady, listenToRoomPlayers, listenToTriviaSubmissions, resetRoom, resetWhoSaidItGame, updateRoomGame, type RoomPlayer, type TriviaSubmission } from "@/lib/firebase";
import WhoSaidItGrid from "@/components/WhoSaidItGrid";

type HostGame = "landing" | "trivia" | "scoreboard";

const triviaCategories = ["who said it?"];

function HostPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomCodeFromUrl = searchParams.get("roomCode") ?? "";
  const [roomCode, setRoomCode] = useState(roomCodeFromUrl);
  const [draftRoomCode, setDraftRoomCode] = useState(roomCodeFromUrl || "");
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [triviaSubmissions, setTriviaSubmissions] = useState<TriviaSubmission[]>([]);
  const [selectedGame, setSelectedGame] = useState<HostGame>("landing");
  const [triviaCategory, setTriviaCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!roomCodeFromUrl) {
      setPlayers([]);
      return;
    }

    setRoomCode(roomCodeFromUrl);
    const unsubscribePlayers = listenToRoomPlayers(roomCodeFromUrl, setPlayers);
    const unsubscribeTrivia = firebaseReady ? listenToTriviaSubmissions(setTriviaSubmissions, roomCodeFromUrl) : () => undefined;

    return () => {
      unsubscribePlayers();
      unsubscribeTrivia();
    };
  }, [roomCodeFromUrl]);

  const handleCreateRoom = async () => {
    const normalized = draftRoomCode.trim().toUpperCase() || Math.random().toString(36).slice(2, 8).toUpperCase();
    const ok = await ensureRoom(normalized);
    if (!ok) {
      return;
    }

    setRoomCode(normalized);
    setDraftRoomCode(normalized);
    router.push(`/host?roomCode=${normalized}`);
  };

  const handleNewGame = async () => {
    setPlayers([]);
    setTriviaSubmissions([]);
    setSelectedGame("landing");
    setTriviaCategory(null);
    await resetRoom(roomCode);
  };


  if (!roomCode) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300">Lobby</p>
          <h1 className="mt-3 text-3xl font-black">Create a room</h1>
          <label className="mt-5 block text-sm text-slate-300">
            Room code
            <input
              value={draftRoomCode}
              onChange={(event) => setDraftRoomCode(event.target.value.toUpperCase())}
              placeholder="ABCD"
              className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-lg text-white outline-none focus:border-fuchsia-500"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              void handleCreateRoom();
            }}
            className="mt-5 w-full rounded-xl bg-fuchsia-500 px-4 py-3 font-bold text-white hover:bg-fuchsia-400"
          >
            Start room
          </button>
        </div>
      </main>
    );
  }

  if (selectedGame === "landing") {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <div className="mx-auto max-w-5xl">
          <header className="mb-10 flex items-center justify-between border-b border-slate-700 pb-5">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-fuchsia-400">Host display</p>
              <h1 className="mt-2 text-4xl font-black">Choose a game</h1>
            </div>
            <div className="rounded-xl bg-fuchsia-500/10 px-4 py-2 text-sm font-semibold text-fuchsia-200">
              Room {roomCode}
            </div>
          </header>

          <button type="button" onClick={() => void handleNewGame()} className="mb-6 rounded-lg border border-rose-400/50 px-4 py-2 font-semibold text-rose-200 hover:bg-rose-500/10">
            New game
          </button>

          <div className="grid gap-5 md:grid-cols-3">
            {[
              { id: "trivia" as const, title: "Trivia", detail: "Pick a category and send questions to players.", color: "from-fuchsia-500 to-rose-500" },
              { id: "scoreboard" as const, title: "Scoreboard", detail: "Track every player's live score.", color: "from-sky-400 to-cyan-500" },
            ].map((game) => (
              <button
                key={game.id}
                type="button"
                onClick={() => {
                  setSelectedGame(game.id);
                  if (game.id === "trivia") {
                    setTriviaCategory(null);
                    void resetWhoSaidItGame(roomCode);
                    void updateRoomGame(roomCode, "whoSaidIt");
                  } else {
                    void updateRoomGame(roomCode, game.id);
                  }
                }}
                className={`min-h-56 rounded-2xl bg-gradient-to-br ${game.color} p-6 text-left text-slate-950 shadow-xl transition hover:-translate-y-1`}
              >
                <span className="text-3xl font-black">{game.title}</span>
                <span className="mt-4 block max-w-xs text-sm font-semibold">{game.detail}</span>
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (selectedGame === "trivia") {
    if (triviaCategory === "who said it?") {
      return (
        <main className="min-h-screen bg-slate-950 p-6 text-white">
          <div className="mx-auto max-w-7xl">
            <button type="button" onClick={() => setTriviaCategory(null)} className="mb-4 rounded-lg border border-slate-600 px-4 py-2 font-semibold text-white">
              Back to trivia categories
            </button>
            <WhoSaidItGrid roomCode={roomCode} players={players} />
          </div>
        </main>
      );
    }

    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <div className="mx-auto max-w-5xl">
          <header className="mb-8 flex items-center justify-between border-b border-slate-700 pb-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-fuchsia-400">Trivia</p>
              <h1 className="mt-2 text-4xl font-black">Choose a category</h1>
            </div>
            <button type="button" onClick={() => setSelectedGame("landing")} className="rounded-lg border border-slate-600 px-4 py-2 font-semibold text-white">
              Back to games
            </button>
          </header>

          <div className="grid gap-5 md:grid-cols-3">
            {triviaCategories.map((category) => (
              <button key={category} type="button" onClick={() => setTriviaCategory(category)} className="min-h-44 rounded-2xl border border-fuchsia-400/40 bg-slate-900 p-6 text-left transition hover:border-fuchsia-300 hover:bg-slate-800">
                <span className="text-2xl font-black text-fuchsia-200">{category}</span>
                <span className="mt-3 block text-sm text-slate-400">Ready for questions</span>
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (selectedGame === "scoreboard") {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <div className="mx-auto max-w-3xl">
          <header className="mb-8 flex items-center justify-between border-b border-slate-700 pb-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-sky-400">Room {roomCode}</p>
              <h1 className="mt-2 text-4xl font-black">Scoreboard</h1>
            </div>
            <button type="button" onClick={() => setSelectedGame("landing")} className="rounded-lg border border-slate-600 px-4 py-2 font-semibold text-white">
              Back to games
            </button>
          </header>
          <ul className="space-y-3">
            {players.length === 0 ? <li className="rounded-xl bg-slate-900 p-5 text-slate-400">No players are connected yet.</li> : players.map((player) => (
              <li key={player.id} className="flex items-center justify-between rounded-xl bg-slate-900 p-5">
                <span className="text-xl font-bold">{player.name}</span>
                <span className="text-2xl font-black text-emerald-400">{player.score}</span>
              </li>
            ))}
          </ul>
        </div>
      </main>
    );
  }

  return null;
}

export default function HostPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">Loading host lobby...</main>}>
      <HostPageContent />
    </Suspense>
  );
}
