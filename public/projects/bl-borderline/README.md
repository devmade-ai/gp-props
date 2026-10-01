# Borderline

A game that tests what you know about the countries of the world: pick a part
of the world and what to name, then fill in every answer you know, on your own
or head to head with a friend.

## Features
- **Name them all.** Choose the whole world, one of 6 regions or one of 25
  subregions, and any mix of seven topics: country names (from their flags),
  capitals, internet domains, dialing codes, currencies, how many official
  languages, and what the people are called. Every country or territory in
  the area gets a row with a box per topic.
- **Just name them.** Instead of topics, name as many places in the area as
  you can from memory, in any order, with no flags or rows as clues: type a
  name, press Enter or Add, and it joins your list. The score is how many of
  the area's places the list names (a place counts once, under any of its
  names). Alone or against a friend.
- **Score first, then every answer.** Nothing is marked while playing.
  "Submit" ends the game and shows the score, then every answer marked right
  or wrong with the right answer beside each miss. In "Just name them" a place
  already on the list isn't added again, under the same name or another one,
  and the results show which names counted and which places were missed.
- **Forgiving typing, strict geography.** Capitals, accents and punctuation
  don't matter, and alternative names from the data are accepted
  ("Ivory Coast"). Near misses ("Nigeria" for Niger) are not.
- **Play a friend.** The same choices start a head-to-head game: send the
  link, and you both get the same game. Each of you sees how far the other
  has got, live, and both scores appear once you've both submitted.
  Each of you then sees your own answers marked, never the friend's. A chat
  beside the game carries tags ("[joking]"), stressed words and reactions.
  Several games with different friends can run at once, and "Play again"
  starts the next one with the same places and topics. No accounts: the phone is the player, with an optional
  name friends see instead of "Your friend". Once you've submitted, you can
  end a game a friend never finishes, and you win.
- **Game alerts.** A menu switch, off until turned on, for a notification
  when a friend joins, finishes (see who won) or ends your game. Turning it on
  and the server's side are built and tested; an alert actually arriving on a
  phone, and a tap on it opening the game, have not been seen yet and wait for
  a real-phone test.
- **No clock, no lost games.** The game in progress is saved on the device, so
  leaving and coming back picks up where it stopped, typed answers included.
- **Installable app.** Add it to a phone's home screen or a computer's dock
  from the menu's "Install app". Step-by-step instructions appear for browsers
  that can't install with one tap.
- **Works offline.** Once opened, the app loads without a connection. Playing
  on your own never needs one; playing a friend does.
- **Automatic updates.** A new version downloads in the background and is
  offered with an Update button; if it isn't taken, it installs itself the
  next time the app opens. The menu's "Automatic updates" switch turns the
  automatic part off, and "Check for updates" looks right away.
- **Light and dark mode.** Follows the device setting until changed from the
  menu; the choice is remembered.
- **How it works.** A short in-app guide, from the menu.

## Stack

React, Vite and Tailwind CSS on the devmade-ai fleet design-token layer
(values from the Borderline design system: Archivo, Figtree and JetBrains
Mono, self-hosted; signal orange on paper and slate), as an installable PWA
(Workbox). Deployed on Vercel. Head-to-head games use Supabase (anonymous
sign-in, reads and realtime) and the tool-till-tees API for every write; that
code loads only when a head-to-head screen opens.

## Data

Country data comes from [mledoze/countries](https://github.com/mledoze/countries),
licensed under the [Open Database License (ODbL) 1.0](https://github.com/mledoze/countries/blob/master/LICENSE).
Flag images come from [flag-icons](https://github.com/lipis/flag-icons) by
Panayiotis Lipiridis, MIT License, so flags look the same on every device,
including Windows, which has no flag emoji.
