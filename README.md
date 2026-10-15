# Forest Hunter

A small three.js first-person hunting game built for the start.ng platform. Scan the forest for animals, zoom in with the scope to identify them, and shoot before time or ammo runs out. You have 90 seconds and 15 shots. Your hunter is dressed in the signed-in user's **central start.ng style** and updates live when that style changes.

There are 9 species, each with its own points and speed. **The wolf is protected: shooting one costs you 50 points.** Trees block your shot and your path. Animals bolt when you fire nearby, or when you get too close while moving: sprinting spooks them from about 24 m, walking from 12 m, and creeping while scoped from 6 m. Standing still keeps you hidden, so stalk slowly to get a closer shot.

## Run locally

```bash
npm start
```

Then open http://localhost:5173. No install step is needed. three.js loads from a CDN, so you need to be online.

1. Click **Sign in on start.ng**. This opens `startng.html`, a mock of the platform.
2. Pick a test user, then click **Play Forest Hunter**.
3. Keep both tabs open. Change colours or the hat on the start.ng tab and watch the hunter change on the menu screen.

## Controls

| Input | Action |
| --- | --- |
| Mouse (click the game to lock it) | Look around |
| W A S D | Walk. Shift while walking forward to sprint. |
| Left click / Space | Shoot |
| Hold right click / Z | Zoom with the scope and name the animal under the crosshair |
| Hold Shift while zoomed | Hold your breath to steady the scope (you creep slowly while scoped) |
| Arrow keys | Look (if the mouse lock doesn't work) |
| Esc | Pause |
| Touch | Drag to look, tap to shoot, hold Walk to move forward, hold Zoom to scope in |

## Project layout

| File | Role |
| --- | --- |
| `src/game.js` | The game: scene, aiming, rounds, input, HUD. |
| `src/animals.js` | The `SPECIES` list (points, speed, size, count, protected) and `createAnimal`. Add an animal by adding one entry. |
| `src/character.js` | Builds the hunter and applies a start.ng style. |
| `src/scores.js` | Per-user best scores and the leaderboard (stored in this browser). |
| `src/platform.js` | The only platform import the game uses. Point it at the real SDK when start.ng ships. |
| `src/startng-mock.js` | Fake SDK: `getCurrentUser`, `onUserChange`, `signIn`, `signOut`, `updateStyle`. Backed by localStorage. |
| `startng.html` + `src/startng-page.js` | Mock start.ng site: sign in and edit your central style. |
| `server.js` | Zero-dependency static server for `npm start`. |

The style shape the game expects:

```js
{ primaryColor: '#ff6b6b', secondaryColor: '#2b2f4a', skinColor: '#8d5524', hat: 'cap', accessory: 'backpack' }
// hat: none | cap | beanie | tophat | crown
// accessory: none | glasses | scarf | backpack
```

## Tweaking

At the top of `src/game.js`: `ROUND_TIME`, `AMMO`, `RELOAD`, `SCOPE_FOV`, `TREES`, `WALK`, `SPRINT`, `SPOOK`.
