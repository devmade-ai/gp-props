# Testing Guide

Manual scenarios with exact actions and expected results. Every scenario below
except 13 and the one-tap install in 20 was run in a browser at phone,
landscape-phone and desktop sizes, and passed (2026-09-25; scenarios 1–9, 16, 21 and
22 again on 2026-09-26 for the one-screen editor, including 21.10–21.12,
arrows on a scrolled picture). Scenarios 13
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

### 4. Paint squares
1. Tap **16 × 16**. Above the grid: the black colour square, `#000000`, **Copy**,
   **Paste**, and "In this picture" with one white sample. Below: **Paint**
   (highlighted), **Pick**, **Insert**, **Delete**.
2. Tap four squares. Each turns black at once; the status reads "Not saved
   yet"; a black sample appears after "In this picture".
3. Type `#ff0000` in the code box. The colour square turns red; tap a square:
   it turns red.
4. Clear the box and type `#ff8800` one character at a time. After `#ff8`
   the box still shows `#ff8` (not `#FFFF88`), and typing carries on to
   `#ff8800`. Leave the box: it tidies to `#FF8800`.
5. Type `hello` and leave the box. An error under it explains what codes look
   like.
6. Save the picture, then tap a black square with black. The status stays
   "Saved" (nothing changed).

### 5. Colour many squares at once
1. Choose red. Tap **Pick**. The pick row appears: "Pick:" **Same colour**
   (off), **All**, **None** (off), and **Pick squares to colour them** (off).
2. Tap three squares. Each gets a ring; the button reads **Colour 3 squares**.
   Tap one again: it unpicks (**Colour 2 squares**).
3. Tap **Colour 2 squares**. Both turn red, the rings go, "Coloured 2 squares
   #FF0000." shows.
4. Pick one white square, tap **Same colour**: every white square is picked.
   **None** unpicks all; **All** picks every square.
5. With squares picked, tap a sample, type a code, use the picker or **Paste**.
- The picks are gone and "Colour changed, so the picked squares were
  unpicked." shows. No square changed colour.
6. With squares picked, tap **Paint**. The picks are gone.

### 6. Colours in this picture
1. With red, black and white squares on the picture, the samples list all
   three, most-used first. The current colour's sample has a ring.
2. Tap the red sample. The code box reads `#FF0000`.
3. Use 20 different colours: the sample row scrolls sideways instead of
   pushing the grid down.

### 7. Copy and paste
1. With red current, tap **Copy**: "Copied #FF0000." The clipboard holds
   `#FF0000`.
2. Choose blue, then tap **Paste** (allow clipboard access if asked):
   "Pasted #FF0000." and red is current again.
3. Copy the text `color: #ff8800;` from anywhere and tap **Paste**: the
   current colour is `#FF8800`.
4. Copy `rgb(255, 0, 0)` and tap **Paste**: a toast says it isn't a colour
   code and what codes look like; the colour doesn't change.
5. In a browser that refuses clipboard reading, tap **Paste**: a toast says to
   press and hold the code box and choose Paste; focus moves to the box.
   (Run headless by making `readText` reject.)

### 8. Nothing happens by accident
1. In Insert or Delete mode, tap a square: nothing changes.
2. In Pick mode, tap squares: nothing is coloured until **Colour N squares**.
3. Changing the colour never recolours picked squares (5.5).

### 9. Keyboard use
1. Tab to the grid. Only one square takes focus from Tab.
2. Arrow keys move one square; Home and End go to the row's first and last
   square; Ctrl+Home and Ctrl+End go to the first and last square.
3. With **Paint** on, Enter paints the focused square. With **Pick** on,
   Space picks and unpicks it.
4. In Insert mode, Tab reaches the edge arrows; Enter on one inserts.

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
1. On an iPhone (Safari) and an Android phone (Chrome), open a picture and
   tap the colour code box above the grid.
- The box stays visible above the keyboard. The bottom nav does not move.
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
   each destination with its icon over its label. The Draw screen fits with
   no scrolling in Paint, Pick and Insert modes: save bar on one row, colour
   controls above the grid, tools below it.
2. 844×390 landscape phone: phone layout stays (bottom nav visible). The
   controls, the grid (squares at their 16px floor) and the tools don't all
   fit in 390px, so the Draw screen scrolls up and down; nothing is wider
   than the screen.
3. 1280×800 desktop: no bottom nav; **New**, **Draw**, **Saved** and the menu
   button are in the header. The 16 × 16 grid fits between the colour
   controls and the tools.

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

### 21. Insert and delete rows and columns
1. Create a 3 × 4 grid and paint square 2 of row 1 red.
2. Tap **Insert**. Arrows appear: 4 along the left (above row 1, between
   rows, below row 3) and 5 along the top; the text says to tap an arrow;
   **Cancel** is next to it; tapping a square does nothing.
3. Tap the arrow above row 1. "Inserted a row." shows, the picture is 4 × 4
   with a blank top row, the red square is now in row 2, and the arrows are
   gone.
4. **Insert** again, then the top arrow left of column 1: 4 × 5, red square
   now in column 3.
5. **Insert**, then **Cancel**: arrows gone, nothing changed. **Insert**, then
   Escape: the same.
6. Tap **Delete**. Arrows appear, one per row (4) and one per column (5).
   Tap the one for row 2 (the red square's row): "Delete row 2?" says its 5
   squares and their colours are removed. **Keep it**: nothing changes and the
   arrows stay. Tap it again, **Delete**: "Deleted row 2.", 3 × 5, arrows
   gone.
7. Create a 1 × 3 grid, tap **Delete**: only column arrows show, and the text
   says a picture needs at least one row.
8. Create a 64 × 2 grid, tap **Insert**: only column arrows show, and the
   text says it already has the most rows (64).
9. Save, reload, open from **Saved**: the changed rows and columns are there.
10. Phone size. Create a 60 × 60 grid, scroll the picture to the middle, and
    tap **Insert**: the squares don't move, and arrows show along the top
    and left of the visible part, each lined up with its line. Scroll: the
    arrows stay on the edges and keep lining up. **Cancel**: the squares
    don't move.
11. Scroll to the bottom-right corner, **Insert**, then the arrow right of
    column 60: the new blank column is in view at the right edge. **Insert**,
    then the arrow below row 60: the new row is in view at the bottom.
12. Scroll back to the top-left, **Delete**: the view stays there, and row 1
    and column 1 sit just inside the arrows, not under them.

### 22. Blank squares in dark mode
1. Menu → **Dark mode**, then create a 4 × 4 grid.
- Every square is black, and the current colour starts white. With **Pick**,
  pick one square and tap **Same colour**: all 16 are picked.
2. Insert a row. Its squares are black.
3. Switch to **Light mode**. The black squares stay black; a new grid made now
   is white, and a row inserted now is white.

## Regression checklist

Before shipping a change, rerun: 1, 3, 4, 5, 7, 8, 10, 11, 12.1, 14, 17, 18, 21, 22.
