# Survive 60 Seconds

A small retro 2D sports game made with plain HTML, CSS, and JavaScript (Canvas).

## Play online

**https://matthewlearns2code32-maker.github.io/survive-60-seconds/**

## How to run on this computer

- **Easiest:** double-click `index.html` (or right-click it in VS Code → *Reveal in File Explorer*, then double-click). It opens in your web browser.
- **With Live Server (optional):** right-click `index.html` in VS Code → *Open with Live Server*. The page refreshes by itself every time you save.

After changing code, save the file (Ctrl+S) and refresh the browser (F5) if you're not using Live Server.

## Files

- `index.html` – the page and the game canvas
- `style.css` – colors and layout around the game
- `game.js` – controls, rules, drawing, and the animation loop
- `Claude_Game_Project_Brief.md` – the project plan (kept on this computer only; listed in `.gitignore`)

## Progress

**Last completed milestone:** 4 – Make it feel good to play (all four milestones done!)

**What works:**
- Retro striped sports field; pixel-art player, defenders and trophies drawn from letter grids
- WASD / arrow-key movement; stays inside the sidelines; diagonals aren't faster
- Start screen → 3-2-1-GO! → play → "YOU SURVIVED!" or "TACKLED!" → Play Again (button or Space)
- Trophies: +1 point each, with a gold sparkle burst and a floating "+1"
- Defenders chase you and push apart so they never merge into one blob
- Running animation (two leg frames + bounce) for you and the defenders
- 3 hearts; a tackle shakes the screen, flashes red, then 1.5 s of flickering safety
- 60-second timer; it stops when the round ends
- Best score (most trophies in one round) saved in the browser, shown in the HUD
- Fullscreen mode (button or F key; Esc or F to leave): the field, HUD and messages grow to fill the screen, keeping the 4:3 shape — added after play-testing so it's easier to see
- **Phones and tablets:** floating joystick (touch anywhere on the field and drag; drag distance = speed), round CLOAK button in the corner (works with a second finger while steering), no scrolling/zooming while playing, layouts for upright and sideways phones; keyboard play unchanged. The fullscreen button hides itself where the browser can't do fullscreen (e.g. iPhone Safari)

**Special ability — CLOAK (Space):**
- Leaves a decoy that looks exactly like you; every defender chases it
- You turn see-through and can walk through defenders without being tackled
- Blinks in its last half second, then 0.5 s of safety
- HUD meter shows READY / ACTIVE / RECHARGING

**Choices so far:**
- Theme: sports, dodging red defenders and grabbing trophies
- Style: retro / chunky pixels, purple jersey
- Tuned after play-testing: player speed 160, defender speed 80, 3 starting defenders, +1 every 5 s (hard!), spawn distance 150
- Cloak tuned to 4 s on / 15 s recharge — powerful but rare
- Special ability: my own idea — a cloak that combines a decoy with invisibility
- Polish picks: running animation, defenders spread out, trophy sparkle, tackle shake, best score, countdown

**Known issues:** none found yet. When 10+ defenders crowd into a corner they can overlap a few pixels (still all visible).

**Play-test feedback:** the screen was a bit small for people with weaker eyesight → added fullscreen mode.

**Next small step:** Pick something from "Maybe later", or let another friend play-test.

**Maybe later:**
- Retro sound effects with a mute button
- Different defender types (patrollers, chargers)
- A difficulty setting (Easy / Normal / Hard)
- Sharing it online with GitHub Pages
- A level editor: click to place walls, then play your level
