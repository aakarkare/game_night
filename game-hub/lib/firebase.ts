import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase, onValue, push, ref, type Unsubscribe } from "firebase/database";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "",
};

export const firebaseReady = Boolean(
  firebaseConfig.projectId && firebaseConfig.databaseURL && firebaseConfig.apiKey
);

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firebaseDb = firebaseReady ? getDatabase(app) : null;
export const firebaseFirestore = firebaseReady ? getFirestore(app) : null;

export type TriviaSubmission = {
  id?: string;
  playerName: string;
  answer: string;
  submittedAt: string;
  question?: string;
};

export type RoomPlayer = {
  id: string;
  name: string;
  score: number;
  avatarColor?: string;
};

export type RoomState = {
  roomCode: string;
  createdAt: number;
  activeGame: "lobby" | "jeopardy" | "trivia" | "questionnaire";
  players?: Record<string, RoomPlayer>;
  whoSaidIt?: WhoSaidItGameState;
};

export type WhoSaidItTileState = {
  phase: "hidden" | "truthLie" | "speaker" | "resolved";
  truthCorrect?: boolean;
  speakerCorrect?: boolean;
};

export type WhoSaidItGameState = {
  tiles: Record<string, WhoSaidItTileState>;
};

function getTriviaSubmissionsPath(roomCode?: string) {
  return roomCode ? `rooms/${roomCode}/trivia_submissions` : "triviaSubmissions";
}

export async function ensureRoom(roomCode: string) {
  if (!firebaseFirestore || !roomCode) {
    return false;
  }

  const normalizedCode = roomCode.trim().toUpperCase();
  const roomRef = doc(firebaseFirestore, "rooms", normalizedCode);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) {
    await setDoc(
      roomRef,
      {
        roomCode: normalizedCode,
        createdAt: Date.now(),
        activeGame: "lobby",
        players: {},
      },
      { merge: true }
    );
  }

  return true;
}

export async function joinRoom(roomCode: string, playerName: string) {
  if (!firebaseFirestore || !roomCode || !playerName.trim()) {
    return null;
  }

  const normalizedCode = roomCode.trim().toUpperCase();
  const trimmedName = playerName.trim();
  const roomRef = doc(firebaseFirestore, "rooms", normalizedCode);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) {
    await setDoc(
      roomRef,
      {
        roomCode: normalizedCode,
        createdAt: Date.now(),
        activeGame: "lobby",
        players: {},
      },
      { merge: true }
    );
  }

  const roomData = (roomSnap.data() ?? {}) as Partial<RoomState>;
  const updatedPlayers = (roomData.players ?? {}) as Record<string, RoomPlayer>;
  const playerId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `player-${Date.now()}`;

  const nextPlayer: RoomPlayer = {
    id: playerId,
    name: trimmedName,
    score: 0,
    avatarColor: `hsl(${(playerId.length * 37) % 360} 75% 60%)`,
  };

  await setDoc(
    roomRef,
    {
      roomCode: normalizedCode,
      activeGame: "lobby",
      players: {
        ...updatedPlayers,
        [playerId]: nextPlayer,
      },
      updatedAt: Date.now(),
    },
    { merge: true }
  );

  return nextPlayer;
}

export async function submitTriviaAnswer(payload: TriviaSubmission, roomCode?: string) {
  if (!firebaseDb) {
    return false;
  }

  const submissionsRef = ref(firebaseDb, getTriviaSubmissionsPath(roomCode));
  await push(submissionsRef, payload);
  return true;
}

export type QuestionnairePayload = {
  text: string;
  submittedAt: string;
  source?: string;
};

export async function submitQuestionnaireEntry(payload: QuestionnairePayload) {
  if (!firebaseFirestore) {
    return false;
  }

  try {
    const col = collection(firebaseFirestore, "questionnaireResponses");
    const docRef = await addDoc(col, {
      text: payload.text,
      submittedAt: payload.submittedAt ?? new Date().toISOString(),
      source: payload.source ?? "google-form",
      createdAt: serverTimestamp(),
    });

    return { ok: true, id: docRef.id };
  } catch (error) {
    console.error("Failed to write questionnaire entry to Firestore:", error);
    return { ok: false, error };
  }
}

export function listenToTriviaSubmissions(
  callback: (submissions: TriviaSubmission[]) => void,
  roomCode?: string
): Unsubscribe {
  if (!firebaseDb) {
    callback([]);
    return () => undefined;
  }

  const submissionsRef = ref(firebaseDb, getTriviaSubmissionsPath(roomCode));

  return onValue(submissionsRef, (snapshot) => {
    const value = snapshot.val();

    if (!value) {
      callback([]);
      return;
    }

    const results = Object.entries(value).map(([key, entry]) => ({
      ...(entry as TriviaSubmission),
      id: key,
    }));

    callback(results as TriviaSubmission[]);
  });
}

export function listenToRoomPlayers(
  roomCode: string,
  callback: (players: RoomPlayer[]) => void
): Unsubscribe {
  if (!firebaseFirestore || !roomCode) {
    callback([]);
    return () => undefined;
  }

  const roomRef = doc(firebaseFirestore, "rooms", roomCode);
  return onSnapshot(roomRef, (snapshot) => {
    const data = snapshot.data() as DocumentData | undefined;
    const rawPlayers = data?.players ?? {};

    const players = Object.entries(rawPlayers).map(([id, value]) => ({
      ...(value as Record<string, unknown>),
      id,
      score: Number((value as { score?: number })?.score ?? 0),
      name: String((value as { name?: string })?.name ?? id),
    })) as RoomPlayer[];

    callback(players);
  });
}

export function listenToWhoSaidItGame(
  roomCode: string,
  callback: (game: WhoSaidItGameState) => void
): Unsubscribe {
  if (!firebaseFirestore || !roomCode) {
    callback({ tiles: {} });
    return () => undefined;
  }

  const roomRef = doc(firebaseFirestore, "rooms", roomCode);
  return onSnapshot(roomRef, (snapshot) => {
    const game = snapshot.data()?.whoSaidIt as WhoSaidItGameState | undefined;
    callback(game ?? { tiles: {} });
  });
}

export async function updateWhoSaidItGame(roomCode: string, game: WhoSaidItGameState) {
  if (!firebaseFirestore || !roomCode) {
    return false;
  }

  await setDoc(doc(firebaseFirestore, "rooms", roomCode), { whoSaidIt: game }, { merge: true });
  return true;
}

export async function updateRoomPlayerScore(roomCode: string, playerId: string, delta: number) {
  if (!firebaseFirestore || !roomCode || !playerId) {
    return false;
  }

  const roomRef = doc(firebaseFirestore, "rooms", roomCode);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) {
    return false;
  }

  const currentPlayers = (roomSnap.data()?.players ?? {}) as Record<string, { score?: number; name?: string; avatarColor?: string }>;
  const existing = currentPlayers[playerId] ?? { name: playerId, score: 0 };

  await updateDoc(roomRef, {
    players: {
      ...currentPlayers,
      [playerId]: {
        ...existing,
        id: playerId,
        name: existing.name ?? playerId,
        score: Number(existing.score ?? 0) + Number(delta),
      },
    },
  });

  return true;
}
