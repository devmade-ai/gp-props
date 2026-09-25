# Testing Guide

Manual scenarios with exact actions and expected results. Every scenario below
except 13 and the one-tap install in 20 was run in a browser at phone,
landscape-phone and desktop sizes, and passed (2026-09-25; scenarios 21 and
22, and the preset sizes and empty boxes in 1–3, on 2026-09-26). Scenarios 13
and 20's one-tap install need a real phone and have not been run yet. A
phone-sized window unless a scenario says otherwise.

## Scenarios

### 1. First load
1. Open the app.
- The header shows the Pixel Art mark (a white pixel heart) and name. The New
  screen shows **New picture** with four buttons, **8 × 8**, **16 × 16**,
  **32 × 32** and **64 × 64**, then **Custom size** with **Rows** and
  **Columns** boxes that are EMPTY (grey example text "e.g. 12" and "e.g. 20",
  no value), "1 to 64" under each, and **Create grid**.
- The bottom nav shows the menu button (left), **New** (highlighted),
  **Saved**, and an empty slot on the right. There is no **Draw** yet.
- A "Ready for offline use." toast appears once the service worker installs.
- No errors in the console.

### 2. Grid size limits
1. Type 0 in **Rows** and 65 in **Columns**, tap **Create grid**.
- Under Rows: "Rows must be from 1 to 64." Under Columns: "Columns must be
  from 1 to 64." Focus moves to Rows. Nothing is created; the page stays on New.
2. Type `abc` or `1.5` in either box and tap **Create grid**.
- The box says to type a number from 1 to 64.
3. Clear both boxes and tap **Create grid**.
- Both boxes say to type a number from 1 to 64; nothing is created.
4. Change a box. Its message disappears.

### 3. Create a grid
1. Tap **16 × 16**. The Draw screen opens with a 16 × 16 white grid, no
   question asked (nothing was open). Go back to **New**.
2. Type 8 and 12, tap **Create grid**.
- The Draw screen opens: "Unsaved picture", "8 × 12 · Not saved yet",
  **Save** and **Save as new** under it, and a white grid of 96 squares that
  fits the screen width. **Draw** appears in the bottom nav, highlighted.

### 4. Colour one square
1. Tap the top-left square.
- The colour window opens: **Colour squares**, the colour bar (white), the
  colour code `#FFFFFF`, **Copy**, **Paste**, **Colours in this picture** (one
  white sample, ringed), and **Squares to colour** with "1 square picked." and
  the tapped square ringed.
2. Type `#ff0000` in **Colour code**.
- The colour bar turns red; the ringed square shows red.
3. Tap **Colour 1 square**.
- The window closes, the square is red, a "Coloured 1 square #FF0000." toast
  shows, and the status still reads "Not saved yet".
4. Open another square, type `00f` in the code box and tap outside the box.
- The box tidies it to `#0000FF`.

### 5. Colour many squares at once
1. Tap square 1 (row 1). In the window tap two more squares.
- "3 squares picked." All three are ringed and show the chosen colour.
2. Tap one of them again. It unpicks: "2 squares picked."
3. Tap **Pick all #FFFFFF squares** (the code is the tapped square's colour).
- Every white square is picked (93 on an 8 × 12 grid with three red squares).
4. Tap **Unpick all**: nothing is picked and the Colour button is disabled.
5. Tap **Pick all**, choose blue, tap **Colour 96 squares**. Every square
   turns blue.

### 6. Colours in this picture
1. With red and blue squares on the picture, open any square.
- Two samples, most-used first. The one matching the current colour is ringed.
2. Tap the red sample. The code box reads `#FF0000` and the bar turns red.

### 7. Copy and paste
1. Open a red square, tap **Copy**.
- "Copied #FF0000." toast. The clipboard holds `#FF0000`.
2. Close the window. Open a blue square, tap **Paste** (allow clipboard access
   if the browser asks).
- "Pasted #FF0000." The code box reads `#FF0000`. **Colour 1 square** makes
  it red.
3. Copy the text `color: #ff8800;` from anywhere, open a square, tap **Paste**.
- The code box reads `#FF8800`.
4. Copy `rgb(255, 0, 0)`, open a square, tap **Paste**.
- A toast says what was copied isn't a colour code and what codes look like.
  The code box keeps its colour.
5. In a browser that refuses clipboard reading (deny the permission when
   asked), tap **Paste**.
- A toast says to press and hold the colour code box and choose Paste; focus
  moves to the box. (Run headless by making `readText` reject: headless
  Chromium never shows the permission prompt, so an ungranted read just
  waits.)
6. Type `#ff88` in the code box and tap **Colour 1 square**.
- An error under the box explains what codes look like; the window stays open.

### 8. Closing the colour window changes nothing
With a new colour chosen but not applied, close the window each of these ways:
**Cancel**, the ✕, tapping outside the window, Escape, the browser/phone Back
button.
- The window closes, no square changes, and after Back the app is still on
  the Draw screen (Back did not leave the page).

### 9. Keyboard use
1. Tab to the grid. Only one square takes focus from Tab.
2. Arrow keys move one square; Home and End go to the row's first and last
   square; Ctrl+Home and Ctrl+End go to the first and last square.
3. Enter opens the colour window with that square picked.
4. In the window's grid, Space picks and unpicks the focused square.
5. With the window open, Tab stays inside it, and the page behind can't be
   reached.
6. Press Escape. The window closes and focus is back on the square that
   opened it. Open it again with Enter and press **Colour 1 square**: focus
   is again on that square. The same holds for the Save as new name box:
   Escape puts focus back on **Save as new**.

### 10. Save and Save as new
1. On a new, coloured picture tap **Save**.
- **Save picture** asks for a name, suggesting "Picture 1", selected.
2. Clear the box and tap **Save**. "Type a name for the picture." shows.
3. Type `Heart`, tap **Save**.
- "Saved “Heart”." The title reads "Heart", the status "8 × 12 · Saved".
4. Colour a square. The status reads "Changes not saved".
5. Tap **Save**. It saves straight away, no name asked. "Saved “Heart”."
6. Tap **Save as new**. The box suggests "Heart copy". Tap **Save**.
- "Saved “Heart copy”." The title is now "Heart copy"; "Heart" is unchanged.

### 11. Saved pictures: open and delete
1. Tap **Saved**.
- Both pictures, newest first, each with a preview, name, size and save time.
  "Heart copy" says "Open now".
2. Tap **Delete** on "Heart". "Delete “Heart”?" explains it can't be brought
   back. Tap **Keep it**: nothing changes. Tap **Delete** again, then
   **Delete**: "Deleted “Heart”." and one picture is left.
3. Go to Draw, colour a square, go to Saved, tap **Open** on "Heart copy".
- "Open “Heart copy”?" says the changes that aren't saved would be thrown
  away. Tap **Open**: the Draw screen shows the saved version, status "Saved".
4. Press Back. The app shows Saved with no dialog.
5. Tap **Delete** on the picture that is open.
- The dialog says it stays open for drawing, as a picture that isn't saved.
  After deleting, Saved shows "No saved pictures yet." with **New picture**.
  Draw still shows it with its name, status "Not saved yet", and **Save**
  asks for a name again, suggesting the old one.
6. On New, with changes that aren't saved, tap **16 × 16** (a custom size
   with **Create grid** asks the same way).
- "Start a new picture?" **Keep drawing it** stays; **Start new picture**
  opens the new blank grid. A blank or saved picture is replaced without
  asking.

### 12. Nothing lost
1. Colour squares, reload the page. The picture and its status are unchanged.
2. Open the app in a second tab and save a picture there. The first tab's
   Saved list shows it without a reload.
3. Fill the browser's storage for the site, then tap **Save as new**.
- A toast says the picture couldn't be saved because the storage is full or
  blocked, and to delete saved pictures to make room. The status still reads
  "Not saved yet". After freeing the space, saving works.

### 13. On-screen keyboard (real phone only, not yet run)
1. On an iPhone (Safari) and an Android phone (Chrome), open a square and tap
   the **Colour code** box.
- The colour window moves or shrinks so the box stays visible above the
  keyboard. The bottom nav does not move.
2. Tap **Save**, the first time, so the name box opens.
- The name box and its buttons stay visible above the keyboard.

### 14. Menu: open and every way to close it
1. Tap the menu button. The menu slides in from the left and covers the
   screen; focus moves into it, onto its ✕; the page behind can't be
   scrolled.
2. Press Escape, then reopen and press Back, then reopen and tap the ✕. Each
   closes it, and Back does not leave the app.
3. On a touch device, swipe the menu to the left. It follows the finger and
   closes past about a third of its width; a shorter swipe springs back.
4. With the menu closed, there is no grey shadow down the left edge of the
   screen.

### 15. Light and dark
1. Menu → **Dark mode**. Colours switch instantly, the menu stays open, and
   the item now reads **Light mode**. The squares keep their own colours.
2. Reload. The app opens dark with no light flash.
3. In a fresh profile, the app follows the device's light/dark setting.

### 16. How it works
1. Menu → **How it works**. The menu closes first, then the guide opens with
   nine steps that match the app.
2. Press Back. The guide closes; the app stays open. **Got it** also closes it.

### 17. Layout at three sizes
1. 360×740 phone: the bottom nav fits (menu, New, Draw, Saved, empty slot),
   each destination with its icon over its label. The Draw screen's name and
   status sit on one line, the buttons under them.
2. 844×390 landscape phone: phone layout stays (bottom nav visible). A grid
   taller than the space scrolls.
3. 1280×800 desktop: no bottom nav; **New**, **Draw**, **Saved** and the menu
   button are in the header. The 16 × 16 grid fits the screen height. The
   colour window is 90% of the width and height, with the colour controls on
   the left and the squares on the right.

### 18. Offline
1. Load the app once online and wait for "Ready for offline use.".
2. Go offline.
3. Open any address inside the app. The New screen loads with no failed
   requests; a grid can be created and coloured.

### 19. Updates
1. With the app open, publish a new version.
2. Menu → **Check for updates**.
- A "A new version is available." banner shows with **Later** and **Update**.
3. Tap **Update**. The page reloads; the menu footer shows the new version,
   and the open picture is unchanged.

### 20. Install
1. Menu → **Install app** in a browser without one-tap install (tested with
   Chrome desktop, iOS Safari and Firefox Android user agents).
- **Install Pixel Art** opens with steps for that browser; **Got it** closes it.
2. On an Android phone in Chrome (not yet run for this app): **Install app**
   shows the browser's own install prompt.

### 21. Insert rows and columns
1. Create a 3 × 4 grid. Colour square 2 in row 1 red.
2. Tap that red square. Under **Rows and columns** the text names "row 1,
   column 2". Tap **Insert row above**.
- The window closes, "Inserted a row." shows, and the picture is 4 × 4: a blank
  row on top, the red square now in row 2, column 2. The status reads "Not
  saved yet" (or "Changes not saved" for a saved picture).
3. Tap the red square again, then **Insert column left**. The picture is 4 × 5
   and the red square is now in column 3; the new column is blank.
4. **Insert row below** and **Insert column right** add the blank line on the
   other side of the tapped square.
5. Create a 64 × 2 grid and tap a square.
- **Insert row above** and **Insert row below** are off, with "This picture
  already has the most rows (64)."; the column buttons still work.
6. Save the picture, reload, and open it from **Saved**: the inserted rows and
   columns are there.

### 22. Blank squares in dark mode
1. Menu → **Dark mode**, then create a 4 × 4 grid.
- Every square is black. Tapping one shows `#000000`, and **Pick all #000000
  squares** picks all 16.
2. Insert a row. Its squares are black.
3. Switch to **Light mode**. The black squares stay black; a new grid made now
   is white, and a row inserted now is white.

## Regression checklist

Before shipping a change, rerun: 1, 3, 4, 5, 7, 8, 10, 11, 12.1, 14, 17, 18, 21, 22.
