---

### File 3: `3_GAME_MODES.md`

```markdown
# Game Modes Specification

## 1. Jeopardy (Host-Managed)
- **Board Grid:** 5 Categories × 5 Value Levels ($200–$1000).
- **Flow:**
  1. Host clicks a grid tile on the `/host` screen to reveal the clue.
  2. Players call out answers in the room (no phone buzzers needed).
  3. Host clicks the **[+ Player]** or **[- Player]** button on the host board to assign score adjustments immediately.
  4. Host clicks **Return to Board** to clear the tile.

## 2. Trivia
- **Flow:**
  1. Host displays a question on `/host`.
  2. Players type their responses on their smartphones via `/play`.
  3. Answers stream live to the Host control panel.
  4. Host reviews answers and clicks **Award Points** next to correct submissions.

## 3. Dedicated Questionnaire Page (`/questionnaire`)
- **Flow:**
  1. Host navigates the TV display to the dedicated `/questionnaire` route.
  2. A large QR code appears alongside real-time result cards.
  3. Guests scan the QR code to fill out the Google Form on their phones.
  4. Webhooks instantly stream form submissions into Firestore, animating charts and response feeds on the `/questionnaire` page.

## 4. Presentation Night
- status: **ON HOLD** (Modules and components bypassed in current route handlers).