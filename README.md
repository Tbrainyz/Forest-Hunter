# Forest Hunter

A small three.js first-person hunting game for [start.ng](https://start.ng). Scan the forest for animals, zoom in with the scope to identify them, and shoot before the timer or your ammo runs out. The game is endless: every level has a mission and gets harder, rounds pay coins, and coins buy upgrades.

There are 11 species, each with its own points and speed. **The wolf is protected: shooting one costs you 50 points.** The rare **White Stag** is worth 150, and the fast, skittish **Golden Fox** (worth 300) vanishes after 25 seconds but gives you an **extra life**. Trees block your shot and your path. Animals bolt when you fire nearby or when you get too close while moving, so stalk slowly.

## Run locally

```bash
npm start
```

Then open http://localhost:5173. There is no install step. three.js loads from jsDelivr, so you need to be online.

Locally the game runs as a **guest**: start.ng's player, character and leaderboard only work once it is live at `forest-hunter.start.ng`. Everything else (levels, coins, upgrades, personal best) works locally.

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

## Levels, coins and upgrades

Each level has a mission, and everything gets harder as you climb: animals run faster and notice you from further away, you get fewer shots and less time, and more protected wolves appear.

| Mission | Example |
| --- | --- |
| Score | Score 76 points |
| Bag | Bag Deer ×2 |
| Distance | Hit an animal from 27 m or more |
| Streak | Hit 3 in a row without missing |
| Clean | Score 90 without hitting a protected animal |
| Boss (every 5th level) | Find and bag the rare **White Stag** |

Clear the mission before time or ammo runs out to move up. If you fail you retry the level with a new mission. Hits earn bonus points for distance (+2 per 10 m) and for running targets (+10). Coins buy four upgrades (up to rank 5): Steady scope, Extra ammo, Soft steps and Quick bolt. Level, coins, upgrades, lives and the run score are saved per player in the browser (`localStorage`).

### Lives and runs

A **run** starts with 3 lives (max 5). Failing a level costs a life, and at 0 the run is over: you restart from the last checkpoint (the level after a cleared boss) with 3 lives, keeping your coins and upgrades. Clearing a boss level gives +1 life and a checkpoint, shooting the Golden Fox gives +1 life, and the shop sells extra lives. Your score **carries on across levels** within a run.

## start.ng

- **Player and character:** `src/platform.js` asks start.ng's connect page who is playing (`startng:whoami`) and dresses the hunter in their character style. Guests get start.ng's guest look.
- **Leaderboard:** `startng.json` defines two columns, "Total score" (the whole run, carried across levels) and "Level reached". After every round a signed-in player's run total and level are sent with `saveScore`, and the end screen shows the top 5 with their levels.
- **Cover:** `cover.png` (16:10) is the card picture on start.ng.

### Publish and update

1. Push this repo to GitHub (public, `index.html` at the top).
2. Check it: `curl -X POST https://api.start.ng/games/check -H "Content-Type: application/json" -d '{"repo_url":"https://github.com/Tbrainyz/Forest-Hunter","name":"forest-hunter"}'`
3. Publish with the same body to `https://api.start.ng/games/publish`, then open the `approve_url` it returns and approve once.
4. After that, `git push` updates the live game within a minute or two.

## Project layout

| File | Role |
| --- | --- |
| `index.html` | The page, HUD and overlay. |
| `src/game.js` | The game: scene, aiming, rounds, input, HUD, shop. |
| `src/animals.js` | The `SPECIES` list (points, speed, size, count, protected, rare) and `createAnimal`. |
| `src/levels.js` | Level difficulty, missions and upgrade costs. |
| `src/progress.js` | Per-player level, coins, upgrades, lives and run score in `localStorage`. |
| `src/character.js` | Builds the hunter and applies a start.ng style. |
| `src/platform.js` | All start.ng calls (player, scores, leaderboard). |
| `startng.json` | Leaderboard columns. |
| `server.js` | Zero-dependency static server for `npm start`. |

## Tweaking

At the top of `src/game.js`: `RELOAD`, `SCOPE_FOV`, `TREES`, `WALK`, `SPRINT`, `SPOOK`. Level difficulty (time, shots, speed) is in `difficulty()` in `src/levels.js`.
