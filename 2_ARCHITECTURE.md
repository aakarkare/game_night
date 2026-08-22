### File 2: `2_ARCHITECTURE.md`

```markdown
# Architecture, Routing & Linux Environment

## Dedicated App Routes
1. **`/host` (Main TV Display):** Controls game navigation, renders the Jeopardy board grid, and provides master score buttons.
2. **`/play` (Player Controller):** Mobile-optimized UI used primarily during Trivia for text answer submissions and viewing personal scores.
3. **`/questionnaire` (Dedicated Survey Hub):** Full-screen page for mid-game polls, displaying live charts, word clouds, and streaming Google Form responses.

## Simplified Control Model
- **Jeopardy:** Fully host-controlled on the `/host` screen. No smartphone buzzer connection required. The host selects tiles, reveals questions, and manually awards or deducts points for players directly on screen.
- **Trivia:** Uses Firebase Realtime Database to stream player text input from `/play` to `/host`.
- **Questionnaire:** Uses Google Apps Script to POST submissions to `/api/form-webhook`, which writes to Firestore and updates `/questionnaire` in real time.

## Linux / VS Code Script Compatibility
All `package.json` scripts use Linux-native POSIX syntax to ensure seamless execution in bash/zsh environments without cross-platform pathing issues:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}