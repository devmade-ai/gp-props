# Fanfare — Testing Guide

Manual scenarios with exact actions and expected results. Two devices (or
two browser profiles) are needed for anything past the first section — call
them **A** (creator) and **B** (joiner).

## Create & share

| Step | Action | Expected |
|---|---|---|
| 1 | A: Games → New game | Invite screen with a `word-word` code |
| 2 | A: Copy code | "Code copied." toast |
| 3 | A: Share link | OS share sheet (or "Link copied" where unsupported) |
| 4 | A: Cancel game → confirm | "This game was cancelled before it started." |
| 5 | Games list | Cancelled badge on the game |

## Join

| Step | Action | Expected |
|---|---|---|
| 1 | B: open `https://…/join#<code>` | Join screen, code pre-filled |
| 2 | B: Join game | Toast, then the setup screen |
| 3 | A: (leave the invite screen open) | It flips to setup by itself within seconds |
| 4 | B: join the same code again from a third profile | "Someone already joined this game." |
| 5 | A: try joining own code | "That's your own game code…" |
| 6 | Any: join a nonsense code | "Game not found" |
| 7 | B: on the join screen for one code, open a link with another | The box shows the new code, and any old error is gone |
| 8 | Open `/join#%E0%A4%A` (a broken link) | The join screen with an empty box; the app doesn't go blank |

## Setup phase

| Step | Action | Expected |
|---|---|---|
| 1 | Both | Own four minors highlighted; opponent's four squares face-down (?) |
| 2 | A: tap two highlighted squares | The two pieces swap |
| 3 | A: Confirm setup | "Setup locked in. Waiting for your opponent…"; squares no longer tappable |
| 4 | B: Confirm setup | Both boards reveal at once (pieces pop in); "Your turn" on exactly one side |
| 5 | Black's device | Board flipped — own pieces at the bottom |

## Play

| Step | Action | Expected |
|---|---|---|
| 1 | Mover: tap own pawn | Dots on its legal squares |
| 2 | Mover: tap a dot | Move paints instantly; opponent's board updates within ~2s |
| 3 | Non-mover: tap a piece | Nothing (not your turn) |
| 4 | Both: bottom panel | Peek shows the last move (e.g. `1. e4`); drag up → move list + captures |
| 5 | Either: drag panel past the bottom | Back on the Games list; reopening the game restores everything |
| 6 | Play a pawn to the last rank | Piece picker (queen/rook/bishop/knight); backdrop cancels the move |
| 7 | Give check | Attacked king glows; "— check!" in the status line |

## Draws, resign, endings

| Step | Action | Expected |
|---|---|---|
| 1 | Mover: Draw | "Draw offered…" on mover; Accept/Decline banner on opponent |
| 2 | Opponent: make a move instead | Offer disappears on both |
| 3 | Offer again → Accept → confirm | "Draw — you both agreed." on both; list badge Draw |
| 4 | Fresh game: Resign → confirm | Loser sees "You resigned.", winner "Your opponent resigned — you won!" |
| 5 | Deliver checkmate | "Checkmate — you won!" / "…you lost." with no further taps possible |

## Rematch

| Step | Action | Expected |
|---|---|---|
| 1 | Finish a game (resign is quickest) | Both finished screens show a Rematch button |
| 2 | A: Rematch | A lands in a NEW game already in setup (no waiting phase) |
| 3 | B: (finished screen open) | Button becomes "Open rematch" by itself; tapping it lands in the same game |
| 4 | Both: confirm setups | Colours are swapped — whoever was Black now moves first |
| 5 | Both tap Rematch simultaneously (best effort) | Both land in the SAME new game |
| 6 | A game cancelled before anyone joined | No rematch button on its finished screen |

## Practice

| Step | Action | Expected |
|---|---|---|
| 1 | Games screen, any state (even the "Couldn't connect" banner in airplane mode) | "Practice on your own" button is present |
| 2 | Open it, tap the black pawn | The board flips — your minors stay at the BOTTOM of the screen (you always play upward); the board's four squares at the top show face-down tokens |
| 3 | Swap two minors, Start | The board's arrangement reveals with the flourish; the board (White) makes the first move |
| 4 | Practice again → Random | Starts immediately — no arranging step; your colour and layout were drawn for you (the board is flipped if you drew Black, and your back rank varies run to run) |
| 5 | Play a move | Status shows "The board is thinking…" with animated dots; the reply lands after a beat (never instantly) |
| 6 | Pick Deep (Practice again) and play into a middlegame | Replies take visibly longer; every reply lands 1.5-4.5s after your move (the deliberate think delay), and NO seconds counter appears — it arms at 5s, past that ceiling, so it means a genuinely slow phone; UI stays responsive throughout |
| 7 | Take back (after at least one of your moves) | Your move AND the board's reply are undone; disabled while thinking and before your first move |
| 8 | Reload mid-game after your own move | The game restores AND the board finishes its move by itself (no deadlock) |
| 9 | Header → Start over (with moves played) | Confirmation first; confirming returns to setup with your colour and strength kept |
| 10 | Finish a game (Beginner is quickest) | Result line in practice voice ("the board wins this one"), Practice again + Back buttons; Take back is gone |
| 10b | Finish a game after taking back twice | The result line ends "(2 takebacks)" — the sheet's peek line says the same; with none used, no bracket at all |
| 11 | Check the Games list afterwards | The practice game appears nowhere |
| 12 | Airplane mode end-to-end (installed PWA) | Everything above works offline |

## Chat (two phones, or two browser profiles)

| Step | Action | Expected |
|---|---|---|
| 1 | Creator: stay on the game screen from `waiting` while the other joins | The chat button appears **without a reload**, and the first message arrives live — this is the one bug the joiner's side cannot show |
| 2 | Either: find the chat button | Bottom-right of the nav on a phone, **not** the header; on a wide screen the nav is gone and it sits in the header. Exactly one on screen either way |
| 3 | Leave the game screen (Games, Practice) | The nav's far-right slot goes empty — and the bar does not shift |
| 4 | Either: open the chat | Slides in from the side; the title is "Chat"; focus lands on Close, and **the keyboard does not open** |
| 5 | Send "gg" | Appears once — not twice — for the sender, within ~2s for the other |
| 6 | Send with two tags and two stressed words | Tags sit above the bubble and colour its inner edge; stressed words are italic with a stroke under the word only, never under a "?" |
| 7 | Type a marked word away (edit the draft) | Its chip disappears; the rest survive |
| 8 | React with the **+**, then tap the same emoji again | Count appears then goes, on both phones, without a long wait |
| 9 | Close the chat, have the opponent send | Dot on the chat button; opening clears it; **sending your own message never lights your own dot** |
| 10 | Open game B's chat, return to game A | Game A's dot is untouched |
| 11 | On a real phone: tap the message box | Composer and Send stay above the keyboard; the board behind does not collapse; dismissing the keyboard restores the panel |
| 12 | Drag the message list toward the screen edge / drag the composer | The list drag closes the drawer; the composer drag selects text and does **not** close it |
| 13 | Android: back button with the chat open | Closes the chat, once — the scrim goes with it |
| 14 | Open the menu while the chat is open (desktop) | The chat closes; never both at once |
| 15 | Finish the game, then chat | Still works; a rematch opens an empty conversation |
| 16 | A third account opens the game URL | Nothing — not the messages, not the game |

## Sounds

| Step | Action | Expected |
|---|---|---|
| 1 | Fresh install, play a move | Silent (sounds are off by default) |
| 2 | Menu → Game sounds | Indicator flips to On and a soft tap plays immediately |
| 3 | Play a quiet move / a capture / give check | Three distinct soft cues, on both your own and opponent moves |
| 4 | Reload mid-game | No sound burst from the loaded history; next new move sounds |

## Turn alerts (two phones; needs the deployed site)

| Step | Action | Expected |
|---|---|---|
| 1 | A: Menu → Turn alerts | Browser permission prompt; on Allow the row shows On |
| 2 | B: join A's game while A's app is CLOSED | A gets "{code}: a friend joined — set up your pieces." |
| 3 | Both confirm setups, A's app closed at reveal if A is White | A gets "…the setups are revealed — your move." |
| 4 | B moves while A's app is closed | A gets "{code}: your move."; a second move REPLACES the notification (no stacking) |
| 5 | A: tap the notification — including on the first launch after installing, and with the app already open on another screen | The right game opens |
| 6 | B resigns while A's app is closed | A gets "…your opponent resigned — you won." |
| 7 | B starts a rematch while A's app is closed | A gets "…a rematch is waiting — set up your pieces." |
| 8 | A: Menu → Turn alerts (On → Off) | Row flips Off; no further pushes arrive |
| 9 | Deny the permission prompt on a fresh profile | Row shows Blocked with help copy on tap |

## Shell & resilience

| Step | Action | Expected |
|---|---|---|
| 1 | Android back with the menu / tutorial / a confirm dialog open | Closes the overlay, stays in the app |
| 2 | Android back on a game screen | Returns to the Games list |
| 3 | Kill and reopen the app mid-game | Game restores (state, moves, a locked setup) |
| 4 | Airplane mode during opponent's turn, then off | Board catches up (realtime reconnect or ≤30s poll) |
| 5 | Airplane mode, then try a move, a chat message, New game, and Menu → Turn alerts (On → Off) | Each shows “Couldn’t reach Fanfare’s server. Check your internet connection and try again.”; the move comes back off the board, the message leaves the chat, Turn alerts stays On |
| 6 | Leave a game open for over an hour (screen on), then move or chat | It goes through — no “Invalid or expired token” |
| 7 | Menu → How to play | One-screen explainer of the twist |
| 8 | Airplane mode with the chat open: tap an emoji on, then off again quickly | “Couldn’t reach Fanfare’s server…” shows; no reaction of yours is left on the message |
| 9 | Open the app when the saved session can no longer be refreshed | The Games screen says “Your session ended. Reload Fanfare to continue.”, a game screen says the same with **Reload**, and no new player is signed in until the page is reloaded |
| 10 | Any screen, menu and chat closed | No grey shadow down the left or right edge of the screen |
| 11 | Keyboard: Practice → Header → Start over (with moves played), then Escape | The confirmation closes and focus is back on **Start over**, not lost to the page |

## Regression checklist (quick pass before a release)

- [ ] Create → join → setup → reveal → a few moves → resign, on two phones
- [ ] a1 renders as a dark square; the setup phase shows no bottom move
      panel (it appears at the reveal)
- [ ] Expanded move panel covers the bottom nav; dialogs scrim the whole
      screen including the header
- [ ] Bottom nav sits flush against the bottom of the browser/system bar —
      no dead band under it (check Firefox on Android specifically: it
      reports a phantom bottom safe-area inset)
- [ ] Shared `/join#code` link pre-fills and joins
- [ ] Black's board is flipped in setup AND play
- [ ] Opponent setup stays hidden until both confirm
- [ ] Move list, captures, and badges match the game
- [ ] Chat: send with a tag and a stressed word, react and un-react, and
      check the unread dot clears — on two devices
- [ ] Dark/light toggle — both themes render correctly (including the chat
      tags, which have their own token spectrum); install prompt still
      present
