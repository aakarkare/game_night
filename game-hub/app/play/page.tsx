"use client";

import { useEffect, useState } from "react";
import {
  firebaseReady,
  joinRoom,
  listenToWhoSaidItGame,
  updateWhoSaidItGame,
  type WhoSaidItGameState,
} from "@/lib/firebase";
import dataset from "../../public/data/who-said-it.json";

const initialGameState: WhoSaidItGameState = {
  tiles: Object.fromEntries(dataset.map((entry) => [entry.id, { phase: "hidden" }])),
};

function PlayPageContent() {
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("Player One");
  const [status, setStatus] = useState("Enter your name and room code to join.");
  const [joinedRoom, setJoinedRoom] = useState(false);
  const [playerId, setPlayerId] = useState("");
  const [gameState, setGameState] = useState<WhoSaidItGameState>(initialGameState);

  useEffect(() => {
    const initialRoomCode = new URLSearchParams(window.location.search).get("roomCode") ?? "";
    setRoomCode(initialRoomCode.toUpperCase());
  }, []);

  useEffect(() => {
    if (!joinedRoom || !roomCode) return;
    return listenToWhoSaidItGame(roomCode, (nextState) => {
      setGameState({ ...nextState, tiles: { ...initialGameState.tiles, ...nextState.tiles } });
    });
  }, [joinedRoom, roomCode]);

  const handleJoinRoom = async () => {
    const normalizedRoom = roomCode.trim().toUpperCase();
    if (!normalizedRoom || !playerName.trim()) {
      return;
    }

    setJoinedRoom(true);
    setStatus(firebaseReady ? "Joining room..." : `Joined ${normalizedRoom} in local preview mode.`);
    window.history.replaceState({}, "", `/play?roomCode=${normalizedRoom}`);

    try {
      const player = await Promise.race([
        joinRoom(normalizedRoom, playerName),
        new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 8000)),
      ]);
      if (!player) {
        setStatus(`Joined ${normalizedRoom}. Cloud sync is unavailable right now.`);
        return;
      }

      setStatus(`${player.name} joined room ${normalizedRoom}.`);
      setPlayerId(player.id);
    } catch {
      setStatus(`Joined ${normalizedRoom}. Cloud sync is unavailable right now.`);
    }
  };

  const selectQuestion = async (tileId: string) => {
    if (!playerId || gameState.tiles[tileId]?.phase !== "hidden") return;
    const nextState = {
      ...gameState,
      activeTileId: tileId,
      activePlayerId: playerId,
      tiles: { ...gameState.tiles, [tileId]: { phase: "truthLie" as const } },
    };
    setGameState(nextState);
    await updateWhoSaidItGame(roomCode, nextState);
    setStatus("Question selected. Watch the host screen for the statement.");
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-fuchsia-950 p-6 text-white">
      <div className="mx-auto max-w-md">
        <header className="mb-8 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-fuchsia-300">Player controller</p>
          <h1 className="mt-3 text-4xl font-black">Trivia Input</h1>
        </header>

        <div className="mb-5 rounded-3xl border border-slate-700 bg-slate-900/80 p-5 shadow-2xl">
          <label className="mb-4 block text-sm font-medium text-slate-200">
            Room code
            <input
              value={roomCode}
              onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
              placeholder="ABCD"
              className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-lg text-white outline-none focus:border-fuchsia-500"
            />
          </label>
          <label className="mb-4 block text-sm font-medium text-slate-200">
            Player name
            <input
              value={playerName}
              onChange={(event) => setPlayerName(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-lg text-white outline-none focus:border-fuchsia-500"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              void handleJoinRoom();
            }}
            className="w-full rounded-xl bg-sky-500 px-4 py-3 font-bold text-slate-950 hover:bg-sky-400"
          >
            Join room
          </button>
          <p className="mt-3 text-sm text-slate-300">{status}</p>
        </div>

        {joinedRoom && (
          <div className="rounded-3xl border border-emerald-500/50 bg-emerald-500/10 p-6 text-center text-emerald-200 shadow-2xl">
            <p className="text-lg font-bold">You are in the room</p>
            <p className="mt-2 text-sm">Wait for the host to start a game.</p>
          </div>
        )}

        {joinedRoom && playerId && (
          <section className="mt-5 rounded-3xl border border-slate-700 bg-slate-900/80 p-5 shadow-2xl">
            <p className="text-sm uppercase tracking-[0.2em] text-fuchsia-300">Who Said It?</p>
            <h2 className="mt-2 text-2xl font-black">Choose a question</h2>
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {dataset.map((entry) => {
                const isAvailable = gameState.tiles[entry.id]?.phase === "hidden";
                return (
                  <button key={entry.id} type="button" disabled={!isAvailable} onClick={() => void selectQuestion(entry.id)} className="min-h-20 rounded-xl bg-slate-800 p-3 text-left font-bold text-amber-300 transition hover:bg-fuchsia-900 disabled:cursor-not-allowed disabled:opacity-40">
                    ${entry.value}
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export default function PlayPage() {
  return <PlayPageContent />;
}
