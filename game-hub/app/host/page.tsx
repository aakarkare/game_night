"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ensureRoom, firebaseReady, listenToRoomPlayers, listenToTriviaSubmissions, updateRoomGame, type RoomPlayer, type TriviaSubmission } from "@/lib/firebase";
import WhoSaidItGrid from "@/components/WhoSaidItGrid";

type Clue = {
  value: number;
  question: string;
  answer: string;
  used: boolean;
};

type Category = {
  name: string;
  clues: Clue[];
};

type Player = {
  id: number;
  name: string;
  score: number;
};

type HostGame = "landing" | "jeopardy" | "trivia" | "scoreboard";

const triviaCategories = ["who said it?"];

const initialCategories: Category[] = [
  {
    name: "Pop Culture",
    clues: [
      { value: 200, question: "This singer is known as the 'Queen of Pop'.", answer: "Madonna", used: false },
      { value: 400, question: "This streaming platform originally launched as 'Sling TV' before rebranding.", answer: "Disney+", used: false },
      { value: 600, question: "This animated film features a snowman named Olaf.", answer: "Frozen", used: false },
      { value: 800, question: "This 2019 film told the story of a young boy learning to be a Jedi.", answer: "The Rise of Skywalker", used: false },
      { value: 1000, question: "This TV show features the quote, 'Winter is coming.'", answer: "Game of Thrones", used: false },
    ],
  },
  {
    name: "Movies",
    clues: [
      { value: 200, question: "This 1994 film follows a young lion cub named Simba.", answer: "The Lion King", used: false },
      { value: 400, question: "This film features a toy cowboy named Woody.", answer: "Toy Story", used: false },
      { value: 600, question: "This movie is set inside the fictional world of Pandora.", answer: "Avatar", used: false },
      { value: 800, question: "This film follows a group of teenagers in a horror movie where a killer stalks them.", answer: "Scream", used: false },
      { value: 1000, question: "This movie features a blue alien named Stitch.", answer: "Lilo & Stitch", used: false },
    ],
  },
  {
    name: "Music",
    clues: [
      { value: 200, question: "This artist released the album '1989'.", answer: "Taylor Swift", used: false },
      { value: 400, question: "This singer is known for 'Rolling in the Deep'.", answer: "Adele", used: false },
      { value: 600, question: "This legendary band recorded 'Hey Jude'.", answer: "The Beatles", used: false },
      { value: 800, question: "This artist is known for the song 'Uptown Funk'.", answer: "Mark Ronson ft. Bruno Mars", used: false },
      { value: 1000, question: "This pop star's full name is Stefani Joanne Angelina Germanotta.", answer: "Lady Gaga", used: false },
    ],
  },
  {
    name: "Food",
    clues: [
      { value: 200, question: "This is the main ingredient in guacamole.", answer: "Avocado", used: false },
      { value: 400, question: "This dish is made from a rolled-up tortilla filled with rice and beans.", answer: "Burrito", used: false },
      { value: 600, question: "This Italian dessert is made with coffee and mascarpone.", answer: "Tiramisu", used: false },
      { value: 800, question: "This is the most common fruit used in a classic fruit salad.", answer: "Strawberry", used: false },
      { value: 1000, question: "This popular breakfast food is made from eggs, toast, and usually hash browns.", answer: "Breakfast plate", used: false },
    ],
  },
  {
    name: "Random",
    clues: [
      { value: 200, question: "The Great Wall of China is mostly located in this country.", answer: "China", used: false },
      { value: 400, question: "This planet is known as the Red Planet.", answer: "Mars", used: false },
      { value: 600, question: "This is the fastest land animal.", answer: "Cheetah", used: false },
      { value: 800, question: "This ocean is the largest on Earth.", answer: "Pacific Ocean", used: false },
      { value: 1000, question: "This is the hardest natural substance on Earth.", answer: "Diamond", used: false },
    ],
  },
];

const initialPlayers: Player[] = [
  { id: 1, name: "Player 1", score: 0 },
  { id: 2, name: "Player 2", score: 0 },
  { id: 3, name: "Player 3", score: 0 },
];

function HostPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomCodeFromUrl = searchParams.get("roomCode") ?? "";
  const [roomCode, setRoomCode] = useState(roomCodeFromUrl);
  const [draftRoomCode, setDraftRoomCode] = useState(roomCodeFromUrl || "");
  const [board, setBoard] = useState(initialCategories);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [selectedClue, setSelectedClue] = useState<{
    categoryIndex: number;
    clueIndex: number;
    clue: Clue;
  } | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [triviaSubmissions, setTriviaSubmissions] = useState<TriviaSubmission[]>([]);
  const [selectedGame, setSelectedGame] = useState<HostGame>("landing");
  const [triviaCategory, setTriviaCategory] = useState<string | null>(null);

  const currentClue = useMemo(() => selectedClue?.clue ?? null, [selectedClue]);

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

  const handleTileClick = (categoryIndex: number, clueIndex: number) => {
    const clue = board[categoryIndex].clues[clueIndex];

    if (clue.used) {
      return;
    }

    setSelectedClue({ categoryIndex, clueIndex, clue });
    setShowAnswer(false);
  };

  const handleScoreUpdate = (playerId: string, delta: number) => {
    setPlayers((currentPlayers) =>
      currentPlayers.map((player) =>
        player.id === playerId ? { ...player, score: player.score + delta } : player
      )
    );
  };

  const handleReturnToBoard = () => {
    if (!selectedClue) {
      return;
    }

    setBoard((currentBoard) =>
      currentBoard.map((category, categoryIndex) =>
        categoryIndex === selectedClue.categoryIndex
          ? {
              ...category,
              clues: category.clues.map((clue, clueIndex) =>
                clueIndex === selectedClue.clueIndex ? { ...clue, used: true } : clue
              ),
            }
          : category
      )
    );

    setSelectedClue(null);
    setShowAnswer(false);
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

          <div className="grid gap-5 md:grid-cols-3">
            {[
              { id: "jeopardy" as const, title: "Jeopardy", detail: "Choose clues and reveal answers.", color: "from-amber-400 to-orange-500" },
              { id: "trivia" as const, title: "Trivia", detail: "Pick a category and send questions to players.", color: "from-fuchsia-500 to-rose-500" },
              { id: "scoreboard" as const, title: "Scoreboard", detail: "Track every player's live score.", color: "from-sky-400 to-cyan-500" },
            ].map((game) => (
              <button
                key={game.id}
                type="button"
                onClick={() => {
                  setSelectedGame(game.id);
                  void updateRoomGame(roomCode, game.id === "trivia" ? "whoSaidIt" : game.id);
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

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex items-center justify-between border-b border-slate-700 pb-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-fuchsia-400">Host display</p>
            <h1 className="mt-2 text-4xl font-black">Jeopardy Board</h1>
          </div>
          <div className="rounded-xl bg-fuchsia-500/10 px-4 py-2 text-sm font-semibold text-fuchsia-200">
            Room {roomCode}
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-5">
          {board.map((category) => (
            <section key={category.name} className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
              <h2 className="mb-4 text-center text-lg font-bold text-amber-300">{category.name}</h2>
              <div className="space-y-3">
                {category.clues.map((clue, clueIndex) => (
                  <button
                    key={`${category.name}-${clue.value}`}
                    type="button"
                    onClick={() => handleTileClick(board.indexOf(category), clueIndex)}
                    disabled={clue.used}
                    className={`flex w-full items-center justify-center rounded-xl px-4 py-5 text-2xl font-black transition ${
                      clue.used
                        ? "cursor-not-allowed bg-slate-700 text-slate-500"
                        : "bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 hover:scale-[1.01]"
                    }`}
                  >
                    ${clue.value}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-8 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-sky-400">Current clue</p>

            {currentClue ? (
              <>
                <h3 className="mt-4 text-3xl font-bold text-white">${currentClue.value}</h3>
                <p className="mt-4 text-lg text-slate-200">{currentClue.question}</p>

                {showAnswer && (
                  <div className="mt-6 rounded-xl border border-emerald-500/50 bg-emerald-500/10 p-4 text-lg text-emerald-200">
                    Answer: {currentClue.answer}
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAnswer(true)}
                    className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950"
                  >
                    Reveal answer
                  </button>
                  <button
                    type="button"
                    onClick={handleReturnToBoard}
                    className="rounded-lg border border-slate-600 px-4 py-2 font-semibold text-white"
                  >
                    Return to board
                  </button>
                </div>
              </>
            ) : (
              <p className="mt-4 text-lg text-slate-400">Select a clue from the board to begin.</p>
            )}
          </div>

          <aside className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-rose-400">Scores</p>
            <ul className="mt-4 space-y-3 text-lg">
              {players.map((player) => (
                <li
                  key={player.id}
                  className="rounded-lg bg-slate-800 p-3"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span>{player.name}</span>
                    <span className="font-black text-emerald-400">{player.score}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleScoreUpdate(player.id, 100)}
                      className="flex-1 rounded-md bg-emerald-500 px-2 py-1 text-sm font-bold text-slate-950"
                    >
                      +100
                    </button>
                    <button
                      type="button"
                      onClick={() => handleScoreUpdate(player.id, -100)}
                      className="flex-1 rounded-md bg-rose-500 px-2 py-1 text-sm font-bold text-white"
                    >
                      -100
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-8 border-t border-slate-700 pt-5">
              <p className="text-sm uppercase tracking-[0.2em] text-cyan-400">Trivia answers</p>
              {triviaSubmissions.length === 0 ? (
                <p className="mt-3 text-sm text-slate-400">No live answers yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {triviaSubmissions.map((submission) => (
                    <li key={`${submission.playerName}-${submission.submittedAt}`} className="rounded-lg bg-slate-800 p-3 text-sm">
                      <div className="font-semibold text-cyan-300">{submission.playerName}</div>
                      <div className="mt-1 text-slate-200">{submission.answer}</div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                        {new Date(submission.submittedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

export default function HostPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">Loading host lobby...</main>}>
      <HostPageContent />
    </Suspense>
  );
}
