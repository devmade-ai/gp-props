# Pixel Art

Make pixel pictures: choose how many rows and columns, then colour the squares.

## Features
- **Any grid size.** From 1 to 64 rows and 1 to 64 columns. Every square
  starts white.
- **Colour window.** Tap a square to pick its colour with the device's colour
  picker, type a colour code such as #FF8800, or tap a colour already used in
  the picture.
- **Copy and paste colours.** Copy a square's colour code, then paste it into
  another square's colour window. Codes pasted from other apps work too.
- **Colour many squares at once.** In the colour window, tap more squares on
  the picture to pick them, or pick every square that has the same colour as
  the one tapped. Picked squares show the new colour before it is applied.
- **Save and Save as new.** Save keeps the picture under a name; saving again
  updates it. Save as new keeps a copy under a new name and leaves the original
  as it was.
- **Saved pictures.** A list with a small preview of each picture. Open one to
  carry on drawing, or delete it. The app asks first before anything unsaved
  or saved is lost.
- **Nothing lost on the way.** The picture being drawn is kept on the device,
  so leaving the app and coming back picks up where it stopped.
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
wouter, vite-plugin-pwa (Workbox). Pictures are stored in the browser's local
storage; there is no server and no account. Deployed on Vercel.
