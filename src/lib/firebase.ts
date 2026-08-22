import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, onValue, push, type Unsubscribe } from 'firebase/database';
import { getFirestore, doc, onSnapshot, getDoc, setDoc, updateDoc, type DocumentData } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ?? '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? '',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const firebaseReady = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.databaseURL,
);

export const db = firebaseReady ? getFirestore(app) : null;
export const rtdb = firebaseReady ? getDatabase(app) : null;

export type PlayerScore = {
  id: string;
  name: string;
  score: number;
  avatarColor?: string;
};

export type RoomSnapshot = {
  roomCode?: string;
  players?: Record<string, PlayerScore>;
};

export function listenToRoomPlayers(roomCode: string, callback: (players: PlayerScore[]) => void): Unsubscribe {
  if (!db || !roomCode) {
    callback([]);
    return () => undefined;
  }

  const roomRef = doc(db, 'rooms', roomCode);
  return onSnapshot(roomRef, (snapshot) => {
    const data = (snapshot.data() as DocumentData | undefined) ?? {};
    const players = Object.entries(data.players ?? {}).map(([id, value]) => {
      const player = value as Record<string, unknown>;
      return {
        id,
        name: String(player.name ?? id),
        score: Number(player.score ?? 0),
        avatarColor: String(player.avatarColor ?? '#60a5fa'),
      } satisfies PlayerScore;
    });

    callback(players);
  });
}

export async function awardPlayerPoints(roomCode: string, playerId: string, delta: number) {
  if (!db || !roomCode || !playerId) {
    return false;
  }

  const roomRef = doc(db, 'rooms', roomCode);
  const roomSnap = await getDoc(roomRef);
  const roomData = (roomSnap.data() as RoomSnapshot | undefined) ?? {};
  const players = roomData.players ?? {};
  const current = players[playerId] ?? { id: playerId, name: playerId, score: 0 };

  await setDoc(
    roomRef,
    {
      ...roomData,
      roomCode,
      players: {
        ...players,
        [playerId]: {
          ...current,
          id: playerId,
          name: current.name ?? playerId,
          score: Number(current.score ?? 0) + Number(delta),
        },
      },
    },
    { merge: true },
  );

  return true;
}

export type TriviaSubmission = {
  id?: string;
  playerName: string;
  answer: string;
  submittedAt: string;
  question?: string;
};

export function listenToTriviaSubmissions(
  roomCode: string,
  callback: (submissions: TriviaSubmission[]) => void,
): Unsubscribe {
  if (!rtdb || !roomCode) {
    callback([]);
    return () => undefined;
  }

  const submissionsRef = ref(rtdb, `rooms/${roomCode}/trivia_submissions`);

  return onValue(submissionsRef, (snapshot) => {
    const raw = snapshot.val();
    if (!raw) {
      callback([]);
      return;
    }

    const submissions = Object.entries(raw).map(([id, entry]) => ({
      ...(entry as Record<string, unknown>),
      id,
      playerName: String((entry as Record<string, unknown>).playerName ?? 'Player'),
      answer: String((entry as Record<string, unknown>).answer ?? ''),
      submittedAt: String((entry as Record<string, unknown>).submittedAt ?? new Date().toISOString()),
    })) as TriviaSubmission[];

    callback(submissions);
  });
}

export async function submitTriviaAnswer(payload: TriviaSubmission, roomCode?: string) {
  if (!rtdb || !roomCode) {
    return false;
  }

  const submissionsRef = ref(rtdb, `rooms/${roomCode}/trivia_submissions`);
  await push(submissionsRef, payload);
  return true;
}
