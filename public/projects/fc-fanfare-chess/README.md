# Fanfare Chess

Two-player chess with a secret-setup twist. Before play, each player secretly
arranges their own bishops and knights on the back rank's four free squares
(king, queen, rooks and pawns stay fixed). Both setups are revealed at once,
then it's standard chess. No accounts and no ratings — share a link, arrange,
play.

**Live:** [fc-fanfare-chess.vercel.app](https://fc-fanfare-chess.vercel.app/)

## Features

- **Create and share.** One tap starts a game with a word code. Share the
  link or the code. Colours are assigned randomly when your friend joins.
- **Secret setup.** Your four minor pieces start in the standard arrangement.
  Tap two highlighted squares to swap them, then confirm. The opponent's
  choice stays face-down until both have confirmed, then both reveal at once.
- **Play.** Tap to move, with legal-move dots, a promotion picker, and
  highlights for the last move and for check. Black sees the board flipped.
  Moves appear on the other board as they happen, and every move is checked
  on the server.
- **Move list and captures** live in a draggable bottom sheet.
- **Endings.** Checkmate, stalemate, threefold repetition, the 50-move rule
  and insufficient material end the game automatically. You can also resign,
  offer or accept a draw, or cancel a game that hasn't started.
- **Rematch.** One tap from the finished screen — same opponent, colours
  swapped, straight into setup. If you both tap, you land in the same game.
- **Practice.** A local game against the board itself. Pick a colour and one
  of five strengths, arrange your minor pieces, and play with takebacks.
  Nothing is saved to your games list, and it works with no connection.
- **Chat.** Once someone has joined, a speech-bubble button opens a chat for
  that game. Tag what you mean, mark the word you'd stress, and react with
  an emoji.
- **Sounds.** Soft move, capture and check cues, off until you turn them on.
- **Turn alerts.** Opt-in notifications for your move, joins, reveals,
  rematches and results. Tapping one opens the right game.
- **Games list.** Every shared game on this device, with a status badge.
- **Installable.** Add it to a home screen. Practice works offline once the
  app is installed. Light and dark mode. A short "How to play" explainer
  lives in the menu.

## How a shared game stays in sync

Both players read the same game. Your setup stays hidden until you both
confirm. Every change — creating a game, joining, the setup, a move, resigning,
a draw, cancelling — is checked before it sticks, so the phone is not the
referee. There is no account: the device gets an anonymous identity the first
time you open the app. Uninstalling, or clearing the site's data, loses the
games on that device, and that is deliberate. Practice never leaves the device.

## Stack

JavaScript, React, Vite, Tailwind CSS, chess.js, and Supabase. Installable
as a PWA. Chess piece artwork by Cburnett. Deployed on Vercel.

## Docs

- [User Guide](USER_GUIDE.md)
- [Testing Guide](TESTING_GUIDE.md)
- [Tutorial](TUTORIAL.md)
