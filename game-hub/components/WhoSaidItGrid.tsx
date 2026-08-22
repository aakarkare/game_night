"use client";

import { useEffect, useState } from "react";
import {
  listenToWhoSaidItGame,
  updateRoomPlayerScore,
  updateWhoSaidItGame,
  type RoomPlayer,
  type WhoSaidItGameState,
} from "@/lib/firebase";
import dataset from "../public/data/who-said-it.json";

type WhoSaidItEntry = (typeof dataset)[number];
type TilePhase = "hidden" | "truthLie" | "speaker" | "resolved";
type TileState = { phase: TilePhase; truthCorrect?: boolean; speakerCorrect?: boolean };

const speakerOptions = ["T", "S", "M", "P", "A"] as const;
const initialTiles: Record<string, TileState> = Object.fromEntries(
  dataset.map((entry) => [entry.id, { phase: "hidden" }])
);

function getInitialGameState(): WhoSaidItGameState {
  return { tiles: initialTiles };
}

export default function WhoSaidItGrid({ roomCode, players }: { roomCode: string; players: RoomPlayer[] }) {
  const [gameState, setGameState] = useState<WhoSaidItGameState>(getInitialGameState);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState(players[0]?.id ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelectedPlayerId((current) => current || players[0]?.id || "");
  }, [players]);

  useEffect(() => {
    return listenToWhoSaidItGame(roomCode, (nextState) => {
      setGameState({ tiles: { ...initialTiles, ...nextState.tiles } });
    });
  }, [roomCode]);

  const selectedEntry = dataset.find((entry) => entry.id === selectedTileId) ?? null;
  const selectedTile = selectedEntry ? gameState.tiles[selectedEntry.id] : null;

  const saveState = async (nextState: WhoSaidItGameState) => {
    setGameState(nextState);
    setSaving(true);
    await updateWhoSaidItGame(roomCode, nextState);
    setSaving(false);
  };

  const openTile = (entry: WhoSaidItEntry) => {
    if (gameState.tiles[entry.id]?.phase !== "hidden") return;
    setSelectedTileId(entry.id);
    void saveState({ ...gameState, tiles: { ...gameState.tiles, [entry.id]: { phase: "truthLie" } } });
  };

  const resolveTruthLie = (answer: boolean) => {
    if (!selectedEntry || !selectedTile || selectedTile.phase !== "truthLie") return;
    const truthCorrect = answer === selectedEntry.isTruth;
    const nextTile = { ...selectedTile, phase: "speaker" as const, truthCorrect };
    void saveState({ ...gameState, tiles: { ...gameState.tiles, [selectedEntry.id]: nextTile } });
    if (truthCorrect && selectedPlayerId) void updateRoomPlayerScore(roomCode, selectedPlayerId, selectedEntry.value);
  };

  const resolveSpeaker = (speaker: string) => {
    if (!selectedEntry || !selectedTile || selectedTile.phase !== "speaker") return;
    const speakerCorrect = speaker === selectedEntry.speaker;
    const nextTile = { ...selectedTile, phase: "resolved" as const, speakerCorrect };
    void saveState({ ...gameState, tiles: { ...gameState.tiles, [selectedEntry.id]: nextTile } });
    if (speakerCorrect && selectedPlayerId) void updateRoomPlayerScore(roomCode, selectedPlayerId, selectedEntry.value);
  };

  return (
    <section className="mt-8 rounded-2xl border border-slate-700 bg-slate-900 p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-fuchsia-400">Trivia / Who Said It?</p>
          <h2 className="mt-2 text-3xl font-black">Truth or lie, then name the speaker</h2>
        </div>
        <label className="text-sm text-slate-300">
          Award points to
          <select value={selectedPlayerId} onChange={(event) => setSelectedPlayerId(event.target.value)} className="ml-2 rounded-lg bg-slate-800 px-3 py-2 text-white">
            <option value="">Select player</option>
            {players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {dataset.map((entry) => {
          const tile = gameState.tiles[entry.id];
          const isOpen = tile?.phase !== "hidden";
          return (
            <button key={entry.id} type="button" onClick={() => openTile(entry)} disabled={isOpen} className={`min-h-28 rounded-xl border p-3 text-left transition [transform-style:preserve-3d] ${isOpen ? "card-flip border-fuchsia-400/50 bg-fuchsia-950/60" : "border-slate-700 bg-slate-800 hover:-translate-y-1 hover:border-fuchsia-400"}`}>
              {isOpen ? <span className="text-sm text-fuchsia-100">{entry.statement}</span> : <><span className="block text-2xl font-black text-amber-300">${entry.value}</span><span className="mt-2 block text-xs uppercase tracking-widest text-slate-400">Reveal</span></>}
            </button>
          );
        })}
      </div>

      {selectedEntry && selectedTile && selectedTile.phase !== "hidden" && selectedTile.phase !== "resolved" && (
        <div className="mt-6 rounded-xl border border-fuchsia-400/40 bg-slate-800 p-5">
          <p className="text-lg font-semibold text-white">{selectedEntry.statement}</p>
          {selectedTile.phase === "truthLie" ? (
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={() => resolveTruthLie(true)} className="rounded-lg bg-emerald-500 px-5 py-3 font-bold text-slate-950">Truth</button>
              <button type="button" onClick={() => resolveTruthLie(false)} className="rounded-lg bg-rose-500 px-5 py-3 font-bold text-white">Lie</button>
            </div>
          ) : (
            <div className="mt-4">
              <p className="mb-3 text-sm text-slate-300">Who said it?</p>
              <div className="flex flex-wrap gap-3">{speakerOptions.map((speaker) => <button key={speaker} type="button" onClick={() => resolveSpeaker(speaker)} className="h-12 w-12 rounded-lg bg-sky-500 text-lg font-black text-slate-950 hover:bg-sky-400">{speaker}</button>)}</div>
            </div>
          )}
        </div>
      )}

      {selectedEntry && selectedTile?.phase === "resolved" && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-5 text-emerald-100">
          <span>Truth: {selectedTile.truthCorrect ? "correct" : "0 points"}. Speaker: {selectedTile.speakerCorrect ? "correct" : "0 points"}.</span>
          <button type="button" onClick={() => setSelectedTileId(null)} className="rounded-lg border border-emerald-400/50 px-4 py-2 font-semibold">Next tile</button>
        </div>
      )}
      {saving && <p className="mt-4 text-xs text-slate-500">Saving game state...</p>}
    </section>
  );
}
