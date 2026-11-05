/* Viewer theme for Streamlit 1.40 (no st.context.theme, no theme selector API).
 *
 * Streamlit keeps the viewer's choice in the parent page's localStorage, key `stActiveTheme-<pathname>-v1`, value
 * JSON {"name": "Light" | "Dark" | "Use system setting" | "Custom Theme", "themeInput"?}; <pathname> is the address the
 * app was first opened on (frontend file static/js/main.*.js, constant ACTIVE_THEME). Not a public API: re-check on any
 * version change. No key = the [theme] of .streamlit/config.toml (brand light).
 *
 * The app theme mode (light | dark | auto, like the Angular ThemeService) is kept in `brand-theme-mode`; "auto" follows
 * prefers-color-scheme. Nothing user-related is stored. */
(function (global) {
  const MODE_KEY = 'brand-theme-mode';
  const RELOAD_GUARD = 'brand-theme-reload';

  function parentWindow() {
    try { return window.parent && window.parent.document ? window.parent : window; } catch (e) { return window; }
  }

  function storageKeys(win, slugs) {
    const path = win.location.pathname;
    const parts = path.replace(/\/+$/, '').split('/');
    const last = parts[parts.length - 1];
    const base = (slugs.indexOf(last) >= 0 ? parts.slice(0, -1).join('/') : parts.join('/')) + '/';
    const keys = new Set([path, base].concat(slugs.map((s) => base + s)).map((p) => 'stActiveTheme-' + p + '-v1'));
    for (let i = 0; i < win.localStorage.length; i++) {
      const k = win.localStorage.key(i);
      if (k && k.indexOf('stActiveTheme-') === 0 && /-v1$/.test(k)) keys.add(k);
    }
    return Array.from(keys);
  }

  function systemDark(win) {
    return !!(win.matchMedia && win.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  function readMode(win) {
    const mode = win.localStorage.getItem(MODE_KEY);
    return mode === 'dark' || mode === 'auto' ? mode : 'light';
  }

  /** The base the mode asks for right now. */
  function wanted(win, mode) {
    return mode === 'dark' || (mode === 'auto' && systemDark(win)) ? 'dark' : 'light';
  }

  /** Writes Streamlit's key for every page path (Dark, or removed so config.toml's brand light applies). */
  function writeStreamlit(win, base, slugs) {
    for (const key of storageKeys(win, slugs)) {
      if (base === 'dark') win.localStorage.setItem(key, JSON.stringify({ name: 'Dark' }));
      else win.localStorage.removeItem(key);
    }
  }

  function reload(win) {
    // One reload per 8 s at most: if the key ever stops working, the page must not loop.
    const last = Number(win.sessionStorage.getItem(RELOAD_GUARD) || 0);
    if (Date.now() - last < 8000) return false;
    win.sessionStorage.setItem(RELOAD_GUARD, String(Date.now()));
    win.location.reload();
    return true;
  }

  /** Header selector: Claro / Escuro / Automático. */
  function setMode(mode, slugs) {
    const win = parentWindow();
    win.localStorage.setItem(MODE_KEY, mode);
    win.sessionStorage.removeItem(RELOAD_GUARD);
    writeStreamlit(win, wanted(win, mode), slugs);
    win.location.reload();
  }

  /** Called on every render of the probe with the base Streamlit applied. Folds a choice made in the ⋮ menu into the
   * app theme mode (Light → light, Dark → dark, system → auto) and re-syncs when the applied base is not the wanted one. */
  function reconcile(appliedBase, slugs) {
    const win = parentWindow();
    let mode = readMode(win);
    let menuChoice = null;
    for (const key of storageKeys(win, slugs)) {
      const raw = win.localStorage.getItem(key);
      if (!raw) continue;
      try { menuChoice = JSON.parse(raw).name; } catch (e) { /* ignore */ }
      if (key === 'stActiveTheme-' + win.location.pathname + '-v1') break;
    }
    if (menuChoice === 'Use system setting') mode = 'auto';
    else if (menuChoice === 'Light') mode = 'light';
    // Streamlit itself stores "Custom Theme" (config.toml) on a fresh load: it is a choice only when we kept Dark.
    else if (menuChoice === 'Custom Theme' && mode === 'dark') mode = 'light';
    // In auto, a Dark key is our own write from when the system was dark, not a choice.
    else if (menuChoice === 'Dark' && mode !== 'auto') mode = 'dark';
    win.localStorage.setItem(MODE_KEY, mode);
    const target = wanted(win, mode);
    const clean = menuChoice === null || menuChoice === 'Dark' || menuChoice === 'Custom Theme';
    if (target !== appliedBase || !clean) {
      // Plain "Light" / system / "Custom Theme" from the ⋮ menu become the brand light (no key) or Dark.
      writeStreamlit(win, target, slugs);
      if (reload(win)) return { mode: mode, base: appliedBase, reloading: true };
    }
    return { mode: mode, base: appliedBase, reloading: false };
  }

  function watchSystem(callback) {
    const win = parentWindow();
    if (!win.matchMedia) return;
    const query = win.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => { if (readMode(win) === 'auto') callback(); };
    if (query.addEventListener) query.addEventListener('change', handler);
  }

  global.brandTheme = { setMode: setMode, reconcile: reconcile, watchSystem: watchSystem, readMode: readMode };
})(window);
