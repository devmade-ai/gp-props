// Requirement: shared navbar — brand mark plus the burger menu with nav links,
//   theme controls, PWA items, and Save as PDF, identical on every page.
// Approach: composes BurgerMenu with this site's MenuItem list in the
//   pattern's recommended order (nav/help, then the theme block kept
//   contiguous, then PWA, then actions) and the Approach-A per-mode theme
//   picker as a render section (BURGER_MENU.md "Theme UI in Burger Menu").
// The outer element is <header>, not <nav> — the menu itself is the <nav>
//   landmark, and nesting one nav inside another reads as two nav regions.
import { BurgerMenu } from './BurgerMenu.jsx';
import { useTheme } from '../hooks/useTheme.js';
import { usePwa } from '../context/PwaContext.js';
import { toggleDarkMode, pickTheme, toggleRandomTheme } from '../lib/theme.js';
import { useToast } from './Toast.jsx';
import { LIGHT_THEMES, DARK_THEMES } from '../lib/themeCatalog.js';
import { THEME_DESCRIPTIONS } from '../data/themeDescriptions.js';
import { version } from '../../package.json';

// Sun when dark (clicking switches to light), moon when light — the icon
// matches the label, which names the mode you'll switch TO.
const SUN_ICON = 'M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z';
const MOON_ICON = 'M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z';

const CHECKMARK = 'M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z';

// The navbar mark keeps the cache-busted public URL (single icon source for
// manifest + links + this img). __ICON_VERSIONS__ is defined by vite.config.js
// from the same content hashes the manifest uses.
const BASE = import.meta.env.BASE_URL;
const iconVersions = typeof __ICON_VERSIONS__ !== 'undefined' ? __ICON_VERSIONS__ : {};
const NAV_MARK = `${BASE}assets/images/icon-192.png?v=${iconVersions['assets/images/icon-192.png'] || '0'}`;

function ThemePicker({ dark, theme }) {
  const themes = dark ? DARK_THEMES : LIGHT_THEMES;
  return (
    <>
      <div className="px-4 pt-2 pb-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-base-content/40">
          {dark ? 'Dark themes' : 'Light themes'}
        </span>
      </div>
      {/* max-h keeps the menu from growing 20+ items tall; overscroll-contain
          stops scroll chaining at the list's ends. */}
      <ul className="list-none m-0 p-0 max-h-52 overflow-y-auto overscroll-contain">
        {themes.map((name) => {
          const active = name === theme;
          return (
            <li key={name}>
              <button
                type="button"
                onClick={() => pickTheme(name)}
                className={`w-full text-left px-4 min-h-11 text-sm flex items-center gap-2 rounded-lg
                  transition-colors cursor-pointer
                  focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[-2px]
                  ${active
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-base-content hover:bg-base-200'
                  }`}
              >
                <span className="truncate">{name.charAt(0).toUpperCase() + name.slice(1)}</span>
                {THEME_DESCRIPTIONS[name] && (
                  <span className="text-xs text-base-content/40 ml-auto truncate">
                    {THEME_DESCRIPTIONS[name]}
                  </span>
                )}
                {active && (
                  <svg className={`w-4 h-4 text-primary shrink-0${THEME_DESCRIPTIONS[name] ? '' : ' ml-auto'}`}
                    viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d={CHECKMARK} clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function Navbar() {
  const { dark, theme, randomEnabled } = useTheme();
  const pwa = usePwa();
  const showToast = useToast();

  const items = [
    { label: 'Projects', href: `${BASE}#projects` },
    { label: 'Patterns', href: `${BASE}#patterns` },
    // Theme block: toggle, picker, random — kept contiguous per the pattern's
    // recommended menu order.
    {
      label: dark ? 'Light mode' : 'Dark mode',
      ariaLabel: dark ? 'Switch to light mode' : 'Switch to dark mode',
      action: toggleDarkMode,
      icon: dark ? SUN_ICON : MOON_ICON,
      separator: true,
      keepOpen: true,
      key: 'mode-toggle',
    },
    { key: 'theme-picker', render: () => <ThemePicker dark={dark} theme={theme} /> },
    {
      label: 'Random theme on load',
      // toggleRandomTheme reports whether the preference persisted — an
      // indicator that silently stays put (storage-blocked browsers) needs
      // an explanation, not a shrug.
      action: () => {
        if (!toggleRandomTheme()) {
          showToast('Couldn’t save this setting — your browser is blocking site storage.', 'error');
        }
      },
      indicator: randomEnabled ? 'On' : 'Off',
      keepOpen: true,
      key: 'random-toggle',
    },
    // PWA block. Toggles stay open; check/install close so their toast,
    // banner, or modal isn't obscured by the menu.
    {
      label: 'Automatic updates',
      action: pwa.actions.toggleAutoUpdate,
      indicator: pwa.autoUpdateEnabled ? 'On' : 'Off',
      separator: true,
      keepOpen: true,
      key: 'auto-update',
    },
    { label: 'Check for updates', action: pwa.actions.checkForUpdates },
    {
      label: 'Install app',
      action: pwa.actions.triggerInstall,
      visible: pwa.showInstallItem,
      highlight: true,
    },
    { label: 'Save as PDF', action: () => window.print(), separator: true },
  ];

  return (
    <header
      className="navbar bg-base-100/80 backdrop-blur-md sticky top-0 z-30 border-b border-base-300 no-print px-4"
      style={{
        paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
      }}
    >
      <div className="navbar-start">
        <a
          href={BASE}
          className="inline-flex items-center gap-2 no-underline hover:opacity-80 transition-opacity min-h-11"
          aria-label="devmade-ai home"
        >
          <img src={NAV_MARK} alt="" width="36" height="36" className="rounded-lg shrink-0" />
          <span className="font-bold text-base-content text-lg">devmade-ai</span>
        </a>
      </div>
      <div className="navbar-end">
        <BurgerMenu items={items} id="burger-menu" version={version} />
      </div>
    </header>
  );
}
