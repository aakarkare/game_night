# Session Score Tracking

## Session State Model (`rooms/{roomCode}`)

```typescript
interface Player {
  id: string;
  name: string;
  score: number;
  avatarColor: string;
}

interface RoomSession {
  roomCode: string;
  createdAt: number;
  activeGame: 'lobby' | 'jeopardy' | 'trivia' | 'questionnaire';
  players: Record<string, Player>;
}