# Testing Guide

Manual scenarios with exact actions and expected results. Every scenario below
was run in headless Chromium on 2026-09-23 (390×844 touch, 1280×800 and 844×390
viewports) and passed, including real redeploys for the update steps.

## Setup

Open the app in a fresh browser profile, in a phone-sized window (390×844)
unless a scenario says otherwise.

## Scenarios

### 1. First load
1. Open the app.
- The header shows the Borderline mark and name; the start screen shows
  **Where** (Region select), **What to name** (seven checkboxes, "Country name
  (from its flag)" ticked), "250 places, 250 answers to find", **Start**, and
  the country-data credit link.
- The bottom nav shows the menu button (left), **New game** (highlighted), and
  an empty slot on the right.
- A "Ready for offline use." toast appears once the service worker installs.
- No errors in the console.

### 2. Menu: open and every way to close it
1. Tap the menu button. The menu slides in from the left and covers the
   screen; focus is on its first item; the page behind can't be scrolled.
2. Press Escape. The menu closes.
3. Open it again, then press the browser/phone Back button. The menu closes
   and the app stays open (Back did not leave the page).
4. Open it again, tap the dimmed area if visible (desktop) or the ✕. Closes.
5. On a touch device, open it and swipe it to the left. It follows the finger
   and closes past about a third of its width; a shorter swipe springs back.
   A vertical drag scrolls instead.

### 3. Light and dark
1. Menu → **Dark mode**. Colours switch instantly, the menu stays open, and
   the item now reads **Light mode**.
2. Reload. The app opens dark with no light flash.
3. With the setting never touched (fresh profile), the app follows the
   device's light/dark preference.
4. With two tabs open, switching in one switches the other.

### 4. How it works
1. Menu → **How it works**. The menu closes first, then the guide opens.
2. Press Back. The guide closes; the app stays open.
3. Open it again; **Got it** closes it.

### 5. Offline
1. Load the app once online and wait for the "Ready for offline use." toast.
2. Go offline (DevTools → Network → Offline).
3. Open the app at any made-up path (for example `/any/path`). The start
   screen loads, with no failed requests.

### 6. Updates
1. Menu → **Check for updates** with nothing new deployed. A "Checking…" toast,
   then "You're on the latest version."
2. Menu → **Automatic updates** flips between On and Off and stays open.
3. With it **Off**: publish a new version, then close the tab and open the
   app again. The "A new version is available." bar appears and the menu
   footer still shows the old version. **Update** reloads into the new version, and the bar does
   not come straight back.
4. With it **On**: publish another version. First open after the deploy:
   the bar appears and the old version keeps running (the app never
   reloads under the user). Close the tab and open again: the app reloads
   itself once into the new version, with no bar.

### 7. Setting up a game
1. Region **Africa**, then **Part of Africa** → **Southern Africa**. The line
   reads "5 places, 5 answers to find".
2. Tick **Capital city**: "5 places, 10 answers to find".
3. Untick both topics: the line reads "Pick at least one thing to name." and
   **Start** is disabled.

### 8. Playing
1. Southern Africa with country names and capitals → **Start**. The URL is
   `/play`; there are 5 cards showing flags only, no names; the bar at the top
   shows "Southern Africa", "Country, Capital", "0 / 10 filled" and
   **Submit**.
2. Type a wrong name in one Country box and the right name in capitals (e.g.
   NAMIBIA) in another: neither box changes colour, and the bar reads
   "2 / 10 filled". **Enter** moves the cursor to the next box.
3. Type that country's capital without accents or capitals: "3 / 10 filled".
4. Reload: the three answers are still in their boxes. Press Back: the start
   screen shows **Continue**, and the nav shows **Game**. **Continue**
   returns to the same game with the same answers.
5. **Submit** → a dialog says "You've filled 3 of 10 boxes…", with **Keep
   playing** focused. Back closes the dialog and the game stays. **Submit** →
   **Submit**: "You got 2 of 10 right." appears and the cards are gone (no
   answers, no right/wrong marks).
6. **New game** → Southern Africa, tick **How many official languages** →
   **Start**. The official-languages box opens a number keyboard on a phone.
   For South Africa's flag, type the name and "eleven"; submit: 2 right.
   Typing "10" instead scores it wrong.
7. **New game** → Oceania → Australia and New Zealand → **Start**; name all 5
   and submit: "You got all 5 right!" appears.
8. Start a game, go Back, press **Start** again: a dialog names the game in
   progress. **Start new game** opens the new one; Back from it lands on the
   start screen, not on the dialog.
9. The whole world with all seven topics appears in about 0.3 s (1,737
   boxes) and typing keeps up with the keyboard. Scrolling down, every flag loads;
   all 250 are images, never emoji, and each flag's description says "Flag
   number N", never the country.
10. With the game open once online, go offline, reload and scroll the whole
    list: every flag still appears.

### 9. Layout
1. At 1280×800 there is no bottom nav; the menu button is in the header.
2. At 844×390 (landscape phone) the bottom nav stays.
3. Every visible button and link is at least 44×44 px.

## Regression checklist

- [ ] On a Windows computer (Chrome or Edge), flags show as pictures, not
      two-letter codes. Not yet checked on real Windows: the headless runs
      prove the flags are images, which is what Windows was missing.
- [ ] Scenarios 1–5 and 8 on a real phone after each deploy (install, offline,
      the keyboard and the Back button behave differently on devices than in
      headless Chrome).
