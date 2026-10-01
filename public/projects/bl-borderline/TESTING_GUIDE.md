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
- The header shows the Borderline mark (an orange tile with Africa outlined
  in ink) and name; the start screen shows **Where** (Region select),
  **What to name** (seven checkboxes, "Country name (from its flag)" ticked),
  "250 places, 250 answers to find", **Play on your own** (orange, dark
  text), **Play a friend**, and the country-data credit link. **Where** and
  **What to name** each have a dash-dot line running to the right edge.
- Text is in the app's own fonts, with no request to Google Fonts: a wide,
  heavy face for headings and the name, a rounded one for everything else.
- The bottom nav shows the menu button (left), **New game** (dark, with an
  orange bar along its top),
  **Friends**, and an empty slot on the right. Each destination has its label
  under its icon.
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
   the item now reads **Light mode**. Close the menu: the page is near-black,
   the header mark is a dark tile with Africa outlined in orange, and
   **Play on your own** is a brighter orange with dark text.
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
   screen loads, and
   the only failed request is Google Analytics' loader, which needs the
   network and which nothing in the game waits for.

### 6. Updates
1. Menu → **Check for updates** with nothing new deployed. A "Checking…" toast,
   then "You're on the latest version."
2. Menu → **Automatic updates** flips between On and Off and stays open.
3. With it **Off**: publish a new version, then close the tab and open the
   app again. The
   "A new version is available." bar appears and the menu footer still shows
   the old version. **Update** reloads into the new version, and the bar does
   not come straight back.
4. With it **On**: publish another version. First open after the
   deploy: the bar appears and the old version keeps running (the app never
   reloads under the user). Close the tab and open again: the app reloads
   itself once into the new version, with no bar.

### 7. Setting up a game
1. Region **Africa**, then **Part of Africa** → **Southern Africa**. The line
   reads "5 places, 5 answers to find".
2. Tick **Capital city**: "5 places, 10 answers to find".
3. Untick both topics: the line reads "Pick at least one thing to name." and
   **Play on your own** and **Play a friend** are both disabled.
4. Both dropdowns show a grey ⌄ arrow about 14 px in from the right edge,
   never touching it, in light and dark; a long choice ("Latin America and
   the Caribbean") never runs under the arrow.

### 8. Playing
1. Southern Africa with country names and capitals → **Play on your own**. The URL is
   `/play`; there are 5 cards showing flags only, no names; the bar at the top
   shows "Southern Africa", "Country, Capital", "0/10 filled" and
   **Submit**. Each card numbers itself top right (001, 002, …) and labels
   its boxes in small capitals (COUNTRY, CAPITAL).
2. Type a wrong name in one Country box and the right name in capitals (e.g.
   NAMIBIA) in another: neither box changes colour, and the bar reads
   "2/10 filled", and an orange line along the bar's bottom edge has grown
   to a fifth of its width. **Enter** moves the cursor to the next box.
3. Type that country's capital without accents or capitals: "3/10 filled".
4. Reload: the three answers are still in their boxes. Press Back: the start
   screen shows **Continue**, and the nav shows **Game**. **Continue**
   returns to the same game with the same answers.
5. **Submit** → a dialog says "You've filled 3 of 10 boxes…", with **Keep
   playing** focused. Back closes the dialog and the game stays. With a
   keyboard, press **Submit** again, then Escape: focus is back on
   **Submit**, not lost to the page. **Submit** →
   **Submit**: "You got 2 of 10 right." leads, with **New game** under it.
   Below, **Your answers** lists all 5 places with their names now showing;
   each box shows what was typed and **Right**, **Wrong** or **Blank**, and
   every box not marked Right shows "Answer: …". The wrong name is marked
   Wrong with the real name beside it; the capitals-only NAMIBIA is Right.
   Reload: the same screen.
6. **New game** → Southern Africa, tick **How many official languages** →
   **Play on your own**. The official-languages box opens a number keyboard on a phone.
   For South Africa's flag, type the name and "eleven"; submit: 2 right.
   Typing "10" instead scores it wrong.
7. **New game** → Oceania → Australia and New Zealand → **Play on your
   own**; name all 5
   and submit: "You got all 5 right!" appears.
8. Start a game, go Back, press **Play on your own** again: a dialog names the game in
   progress. **Start new game** opens the new one; Back from it lands on the
   start screen, not on the dialog.
9. The whole world with all seven topics appears in about 0.3 s (1,737
   boxes) and typing keeps up with the keyboard. Scrolling down, every flag loads;
   all 250 are images, never emoji, and each flag's description says "Flag
   number N", never the country.
10. With the game open once online, go offline, reload and scroll the whole
    list: every flag still appears.

### 9. Layout
1. At 1280×800 there is no bottom nav; the header holds **New game**,
   **Friends** (and **Game** while a game on your own is saved) and the menu
   button, and **Friends** opens the list.
2. At 844×390 (landscape phone) the bottom nav stays.
3. Every visible button and link is at least 44×44 px.
4. At 360×740 with a game on your own saved, the nav shows **New game**,
   **Game** and **Friends** without the page scrolling sideways.

### 11–18. Playing a friend

Head-to-head needs the game server. Scenarios 11–18 were run on 2026-09-23
as one automated two-browser script (390×844 touch, plus a 1280×800 run for
step 15.2) against the real backend: all 63 checks passed, plus 5 in a
separate run of step 18.4. Re-run on 2026-09-25 against the current code:
68 checks, all passing, adding step 11.8 and scenario 21 (see 21). Step 15.3
was run with the server's requests blocked rather than a real offline
phone. Step 18.2 took its error branch, because headless Chromium has no push
service; turning alerts on for real, and an alert arriving, need a real phone
(regression checklist). Use two browsers with separate profiles, A and B.

### 11. Starting and joining
1. A: Southern Africa, untick country names, tick **Capital city** → **Play a
   friend**. A dialog asks "What should your friend call you?" with the
   **Your name** box focused. Type 21 characters → **Save**: "Names can be up
   to 20 characters. Try a shorter one." Type "  Ann  " → **Save**. The URL
   is `/match/<id>`. A box reads **Send this to a friend**
   with a `/join#word-word` link, **Share link**, **Copy code** and **Cancel
   this game**. Under the title: "Nobody has joined yet." There are 5 boxes
   and no chat button.
2. A: type "gaborone" for Botswana, wait 2 seconds.
3. B: open the link. The **Game code** box already holds the code. **Join
   game** → the name dialog → **Skip** → the same `/match/<id>`, a "You're
   in" toast, and the line "Ann has filled 1 of 5."
4. A, without reloading: the invite box disappears, the line reads "Your
   friend hasn't filled any boxes yet.", and a chat button appears bottom
   right.
5. B: type two capitals. A, without reloading: "Your friend has filled 2 of 5."
6. A: reload. "gaborone" is still in its box.
7. A third browser opening the same link, tapping **Join game** and skipping
   the name gets "Someone has already joined this game."
8. A browser still on the join screen for one game opens the link for
   another (only the part after `#` changes, so the page doesn't reload): the
   **Game code** box shows the new code and any old error goes, and **Join
   game** joins the new game. (It used to keep the first code.)

### 12. Chat
1. A: tap the chat button. The chat slides in from the right; focus is on ✕,
   not the message box. Type "hello there", tap the tag button, tap
   **[joking]**, tap the word **there**, send. The message shows the
   [joking] tag, a coloured edge, and "there" in italics with a stroke under
   it; the message box empties.
2. B: the chat button's name is "Chat, 1 unread" and it shows a dot. Open it:
   the title reads "Chat with Ann", and the message is there with its tag and
   stressed word. Tap **+** → 👍, and
   send "good luck".
3. A: the 👍 under the message shows "1", and "good luck" appears.
4. A: press Back. The chat closes and the game stays open, with no grey
   shadow down the right edge of the screen.

### 13. Submitting and the result
1. A: **Submit** → **Submit**. "You got 2 of 5 right." and "Waiting for your
   friend to finish.", then A's own answers marked as in 8.5. No boxes to
   type in.
2. B, without reloading: "Ann has finished." B cannot see A's score
   anywhere.
3. B: **Submit** → **Submit**. B sees "Ann won.", "You 1 of 5",
   "Ann 2 of 5".
4. A, without reloading: "You won!" with both scores, **Play again** and
   **New game**, and A's answers marked under them. B sees B's own answers
   marked, never A's.

### 14. Play again, the list, and cancelling
1. B: **Play again** → a new `/match/<id>` with 5 empty boxes.
2. A, without reloading: **Go to the next game** replaces **Play again**; it
   opens the same new game.
3. A: **Friends** lists both games: the new one "Your turn", the finished one
   "You won".
4. A: start another game with a friend. No name dialog this time. Type
   anything in one box, **Submit** → **Submit**: the score shows, and **Send
   this to a friend** stays below it (without "You can start now"), with no
   **End the game** button. **Cancel this game** → **Cancel game**. The list
   opens; the link from that game now answers "Your friend cancelled this
   game."

### 15. Offline, the desktop and playing alone
1. On your own, from a fresh profile: play and submit a game. No request goes
   to the game server, and none of the head-to-head code loads.
2. At 1280×800, on a game a friend has joined: the chat button is in the
   header beside the menu button, and the drawer opens on the right.
3. With the server unreachable, open **Friends**: "Couldn't connect to
   Borderline's server…" with **Try again**. Playing on your own still works.

### 16. Ending a game the friend doesn't finish
1. On the game from 14.1 (both on it, nothing submitted): B's line reads
   "Ann hasn't filled any boxes yet."
2. A: type one right capital, **Submit** → **Submit**. Under the score:
   "Waiting for your friend to finish" and **End the game**.
3. A: **End the game**. The dialog says "…can't send their answers any more,
   and you win." → **End the game**. A sees "You won!", "You 1 of 5", "Your
   friend Didn't finish".
4. B, without reloading: "Ann ended the game before you finished.", "Ann
   won.", "You Didn't finish", "Ann 1 of 5", and no boxes.

### 17. Names on the Friends screen
1. B: **Friends** reads "Your friends see you as “Your friend”." and each row
   says "with Ann".
2. B: **Add a name** → type "Ben" → **Save**. A toast: "Saved. Your friends
   now see you as Ben."
3. A: **Friends**: both games say "with Ben".

### 18. Game alerts and a message sent while the chat loads
1. In a fresh browser with notifications allowed: the menu shows **Game
   alerts** with "Off", and opening the menu loads none of the head-to-head
   code.
2. Tap **Game alerts**: it turns **On**, or, where the browser has no push
   service, stays **Off** with "Couldn't turn on game alerts on this device.
   Please try again later."
3. A, on a game with B: hold back the chat's first load (in the script, the
   first chat response is delivered 5 seconds late), open
   the chat and send "race check" at once. After the load lands, and well
   before the 30 s poll, "race check" is still in the conversation. (It used
   to vanish until the poll; the same check fails on the old code.)
4. With alerts on (in the script: the stored choice set and notifications
   allowed) and the server unreachable, tap **Game alerts**: "Couldn't reach
   Borderline's server…" and the switch stays **On**. With the server back,
   tap again: it reads **Off**.

### 19. When something fails, and leaving mid-way
Run on 2026-09-24 in headless Chromium at 390×844 against the built app,
with every server request answered by a stub in the script: 27
checks, including 9.3 on every head-to-head screen, all passing. On the code
before these fixes the same script fails steps 1–5, 7's chips and 8. Steps
1–6 need a way to make one request fail or slow, such as the browser's
request blocking and throttling.
1. From a fresh profile, **Play a friend** → type a name → **Save**, and
   while it says **Saving…** tap outside the dialog, press Escape, or press
   Back: the dialog stays until the name is saved, then exactly ONE game
   opens.
2. Open a game while its request fails: "Couldn't load this game" and **Try
   again**. Let the request through and tap **Try again**: the game opens.
3. Open **Friends** while only the list request fails: "Couldn't connect to
   Borderline's server…" and **Try again**. Let it through and tap **Try
   again**: "Loading your games…", then the list.
4. Block the Friends screen's code file and tap **Friends**: "Couldn't open this screen. Check your connection, then
   reload." with **Reload**; the header and the bottom nav stay, and **New
   game** still opens the start screen.
5. Block the chat's code files and open a game a friend has joined: the game and the nav work, and there is simply
   no chat button.
6. On a game, type an answer and leave for **New game** within a second: the
   filled count still reaches the server (one progress request).
7. The invite link under **Send this to a friend** is text to select, not a
   link; every control in that box is at least 44×44 px. In the chat, pick a
   tag and a stressed word: each chip above the message box is a 44×44 px
   target.
8. Open **Friends**, then go to **New game** and play on your own for a
   minute: no request goes to the game server after leaving, and the live
   connection closes as you leave.

### 20. Just name them, on your own
Run on 2026-09-25 in headless Chromium at 390×844 against the built app
(with every backend request stubbed, as in 19): all steps below passing.
Steps 3–6 re-run on 2026-09-26 after repeats and second names for a place
were refused and results added, with no backend request made at all:
passing.
1. Region **Oceania**, tick **Just name them**: every topic unticks and the
   line reads "27 places to name". The row is at least 44 px tall.
2. **Play on your own**: the bar reads "Oceania", "Just name them", "0
   typed". The box is 44 px tall with 16 px text; **Add** is 44×44 px.
3. Type "Australia" + **Enter**, "new zealand" + **Add**: after **Add** the
   cursor is still in the box and it is empty. Add "Fiji", "Atlantis"; press
   **Enter** on "   ": nothing is added. Add "FIJI": it is NOT added, the
   line under the box turns red and reads "“Fiji” is already on your list,
   so it wasn't added again.", and "FIJI" stays in the box, selected. Type
   anything: the line goes back to the count. Add "Aotearoa": it is NOT
   added, and the line reads "“Aotearoa” is the same place as “new
   zealand”, which is already on your list, so it wasn't added." Clear the
   box. The list reads, newest first, "Atlantis, Fiji, new zealand,
   Australia" exactly as typed, with no marks, and "4 names so far".
4. **Remove Atlantis** (a 44×44 px ✕): it goes; "3 names so far". Add
   "Samoa": "4 names so far".
5. Type "Tonga" without adding it, reload: the four names and "Tonga" in the
   box are still there.
6. **Submit**: the dialog says "You've typed 4 names…". **Submit**: "You named
   4 of 27." leads. Under it **Your list** shows the four names as typed,
   each **Right** ("new zealand" with "New Zealand" under it), then **Places
   you missed (23)** with each place's flag and name. No request went to the
   game server.
7. Back on the start screen, tick **Just name them**, then **Capital city**:
   only Capital city is ticked and the line counts answers again; that game
   has its boxes and scores "You got N of M right."
8. A game saved before this mode (topics, no list) still opens with its
   answers.

### 21. Just name them, with a friend
Same run as 20, with every backend request stubbed. Also run on 2026-09-25
in the two-browser run against the real backend (11–18): Australia and New Zealand (5 places), A names Australia,
New Zealand and Atlantis and B's line reads "Ann has typed 3 names."; A's
Submit shows "You named 2 of 5."; B's six entries (australia, Australia,
Fiji, Tonga, Samoa, Nauru; a repeat that is refused since 2026-09-26) submit
although the list is longer than the 5 places, and both see the result, 2
of 5 against 1 of 5. Steps 3 and 4 as written below, with repeats refused
and the results under the score, have not yet been run with a friend.
1. Oceania, **Just name them**, **Play a friend** → **Skip**: the game is
   created over the region's 27 places, and the bar says "Just name them".
2. On a game whose friend Sam has typed 23: the live line reads "Sam has
   typed 23 names."
3. Over a three-place game, type Australia, Fiji, fiji, Narnia, Tonga:
   "fiji" is refused as already on the list, and 1.5 s later the live count
   sent is 4 (every entry, even over the three places).
4. **Submit** → **Submit**: the score sent is 2 of 3, with the filled count
   capped at 3 (the server requires it), and the server accepts it. The
   result shows "You won!", 2 of 3 and
   1 of 3, then this phone's list marked (Narnia **Not counted**) and the
   places missed. The list stays on the phone until the game leaves the
   Friends list.

### 22. Reload notices, typing with an input method, and reactions
Run on 2026-09-25 in headless Chromium at 390×844 against the built app, every
backend request stubbed (as in 19); steps 5 and 6 as scripts over the real
chat code, and step 4's sign-in rule also over the real sign-in library with
its network stubbed.
1. Open a game set up with a mode this version doesn't know, on its own or
   beside a known topic: "This game needs the newest version of
   Borderline. Reload to play it." with a 44×44 px **Reload**; no boxes, no
   list, no **Submit**, no "0/0", and nothing is sent to the server. On
   **Friends** the game's line reads "Needs the newest version of
   Borderline". **Reload** reloads the page.
2. With a stored session whose token has expired, block the token refresh
   (no network) and open **Friends**: "Couldn't connect to Borderline's
   server…", and no new sign-in is made. Let it through and, a minute later
   (a failed refresh's answer is repeated for 60 s), tap **Try
   again**: the same player's games load.
3. With the server refusing the stored session, open **Friends**:
   "Borderline's server doesn't recognise this device any more. Reload
   Borderline…" with **Reload**, never "check your internet", and no new
   sign-in until the page is reloaded. A game screen says the same.
4. Solo play after opening **Join** or a failed **Play a friend**: no request
   to the game server for 45 s.
5. In the chat, the friend removes a reaction while a refresh is loading:
   it stays removed when the refresh lands (the realtime event carries the
   id only).
6. Offline, tap a reaction on, then off: both fail, and it ends off, as it
   was; a reaction the friend added meanwhile stays.
7. Type with an input method (Japanese, say) in the "Just name them" box, an
   answer box or the chat: the Enter that picks the characters doesn't add
   the name, move to the next box or send the message; the next Enter does.

### 23. The look, the score and link previews
Run in headless Chromium on 2026-10-01 (390×844 and 1280×800, both themes;
head-to-head screens against a stubbed backend and share sheet), except
step 5, which needs the deployed site.
1. Play Southern Africa with country names → type two right → **Submit** →
   **Submit**. A white card with a dark edge and an orange block behind it
   shows "2/5" in very large type (the slash orange) and "You got 2 of 5
   right." under it. Below, **Your answers** with a dash-dot line; each wrong
   answer is crossed out, beside a **WRONG** badge and the right answer.
2. Tab through the start screen: every button, link, box and checkbox shows
   an orange ring when it has focus.
3. Press and hold **Play on your own**: it sinks onto the dark line under it.
4. Play a friend → the invite box shows the link in grey monospace, and on a
   phone **Share link** offers a message reading "Play me at Borderline:
   Southern Africa (Capital)." with the link.
5. After a deploy: the live `/join` page's link-preview tags give the title
   "A friend wants a game" and the invite card, and `/` still gives
   "Borderline" and the app card. Pasting a `/join#code` link into a
   messaging app shows the dark "A friend wants a game." card.
6. The whole world with country names → **Play on your own**, scroll past
   row 200 and type in a box there → **Submit** → **Submit**: the screen
   opens at the top on the score, not partway down the results. The same
   from a game with a friend once the score is sent (run 2026-10-01; before
   the fix the score was 32,000 px above the screen in both).

## Regression checklist

- [ ] On a Windows computer (Chrome or Edge), flags show as pictures, not
      two-letter codes. Not yet checked on real Windows: the headless runs
      prove the flags are images, which is what Windows was missing.
- [ ] Scenarios 1–5, 8 and 20 on a real phone after each deploy (install, offline,
      the keyboard and the Back button behave differently on devices than in
      headless Chrome).
- [ ] Scenarios 11–18 on two real phones (the soft keyboard over the chat
      composer, the share sheet, a link opened from a messaging app, and game
      alerts turning on, arriving and opening the game are device behaviour).
