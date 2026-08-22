'use client';

import { FormEvent, Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { firebaseReady, joinRoom, submitTriviaAnswer, type TriviaSubmission } from "@/lib/firebase";

const question = "Which movie features the iconic quote “I’ll be back”?";

function PlayPageContent() {
  const searchParams = useSearchParams();
  const [roomCode, setRoomCode] = useState(searchParams.get("roomCode") ?? "");
  const [playerName, setPlayerName] = useState("Player One");
  const [answer, setAnswer] = useState("");
  const [submission, setSubmission] = useState<TriviaSubmission | null>(null);
  const [status, setStatus] = useState("Waiting for your answer.");
  const [joinedRoom, setJoinedRoom] = useState(false);

  const submitLabel = useMemo(() => {
    if (!firebaseReady) {
      return "Local preview mode";
    }

    return "Submit answer";
  }, []);

  const handleJoinRoom = async () => {
    const normalizedRoom = roomCode.trim().toUpperCase();
    if (!normalizedRoom || !playerName.trim()) {
      return;
    }

    const player = await joinRoom(normalizedRoom, playerName);
    if (!player) {
      setStatus("Unable to join this room right now.");
      return;
    }

    setJoinedRoom(true);
    setStatus(`${player.name} joined room ${normalizedRoom}.`);
    window.history.replaceState({}, "", `/play?roomCode=${normalizedRoom}`);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const trimmedAnswer = answer.trim();
    if (!trimmedAnswer) {
      return;
    }

    const payload: TriviaSubmission = {
      playerName: playerName.trim() || "Player One",
      answer: trimmedAnswer,
      submittedAt: new Date().toISOString(),
      question,
    };

    setSubmission(payload);

    if (firebaseReady) {
      const didSubmit = await submitTriviaAnswer(payload, roomCode.trim().toUpperCase() || undefined);
      setStatus(
        didSubmit
          ? `${payload.playerName} sent to the live trivia board.`
          : "Firebase is unavailable. Showing local preview only."
      );
      return;
    }

    setStatus(`${payload.playerName} submitted in local preview mode.`);
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
          {status && <p className="mt-3 text-sm text-slate-300">{status}</p>}
        </div>

        <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-700 bg-slate-900/80 p-6 shadow-2xl">
          <div className="mb-6">
            <p className="mb-2 text-sm font-medium text-slate-200">Current question</p>
            <div className="rounded-xl bg-slate-800 p-4 text-base text-slate-100">{question}</div>
          </div>

          <label className="mb-6 block text-sm font-medium text-slate-200">
            Your answer
            <textarea
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              rows={4}
              placeholder="Type your answer here..."
              className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-base text-white outline-none focus:border-fuchsia-500"
              disabled={!joinedRoom}
            />
          </label>

          <button
            type="submit"
            disabled={!joinedRoom || !answer.trim()}
            className="w-full rounded-xl bg-fuchsia-500 px-4 py-3 text-lg font-bold text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:bg-slate-600"
          >
            {submitLabel}
          </button>
        </form>

        {submission && (
          <div className="mt-6 rounded-2xl border border-emerald-500/50 bg-emerald-500/10 p-4 text-center text-emerald-200">
            <p className="font-bold">Answer submitted</p>
            <p className="mt-2 text-sm">{submission.playerName}: “{submission.answer}”</p>
            <p className="mt-1 text-xs text-emerald-100">{status}</p>
          </div>
        )}
      </div>
    </main>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">Loading lobby...</main>}>
      <PlayPageContent />
    </Suspense>
  );
}
