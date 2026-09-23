# Borderline

A game that tests what you know about the countries of the world: pick a part
of the world and what to name, then fill in every answer you know.

## Features
- **Name them all.** Choose the whole world, one of 6 regions or one of 25
  subregions, and any mix of seven topics: country names (from their flags),
  capitals, internet domains, dialing codes, currencies, languages, and what
  the people are called. Every country or territory in the area gets a row
  with a box per topic, and each box turns green the moment it's right.
- **Forgiving typing, strict geography.** Capitals, accents and punctuation
  don't matter, and alternative names from the data are accepted
  ("Ivory Coast"). Near misses ("Nigeria" for Niger) are not.
- **No clock, no lost games.** The game in progress is saved on the device, so
  leaving and coming back picks up where it stopped. "Give up" ends it with the
  score.
- **Installable app.** Add it to a phone's home screen or a computer's dock
  from the menu's "Install app". Step-by-step instructions appear for browsers
  that can't install with one tap.
- **Works offline.** Once opened, the app loads without a connection.
- **Automatic updates.** A new version downloads in the background and is
  offered with an Update button; if it isn't taken, it installs itself the
  next time the app opens. The menu's "Automatic updates" switch turns the
  automatic part off, and "Check for updates" looks right away.
- **Light and dark mode.** Follows the device setting until changed from the
  menu; the choice is remembered.
- **How it works.** A short in-app guide, from the menu.

## Stack

React 19, Vite 7, Tailwind CSS 4 on the devmade-ai fleet design-token layer,
vite-plugin-pwa (Workbox). Deployed on Vercel.

## Data

Country data comes from [mledoze/countries](https://github.com/mledoze/countries),
licensed under the [Open Database License (ODbL) 1.0](https://github.com/mledoze/countries/blob/master/LICENSE).
Flag images come from [flag-icons](https://github.com/lipis/flag-icons) by
Panayiotis Lipiridis, MIT License, so flags look the same on every device,
including Windows, which has no flag emoji.
