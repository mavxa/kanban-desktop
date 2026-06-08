import { useEffect, useRef } from "react";

/**
 * Layout-independent hotkey hook based on `event.code`.
 *
 * `@tanstack/react-hotkeys` matches `event.key`, which contains the
 * character the OS produced for the current keyboard layout. On a
 * non-Latin layout (RU, etc.) `Ctrl+N` arrives as `event.key === "т"`,
 * which the library cannot map back to "N", so the hotkey never fires.
 *
 * This hook matches `event.code` ("KeyN") instead and only fires when
 * the active layout is non-Latin so it complements tanstack hotkeys
 * rather than firing twice.
 *
 * @param code - DOM `event.code` value, e.g. "KeyN".
 * @param mods - Required modifier state. Each unset modifier defaults
 *               to `false` (must NOT be pressed).
 * @param callback - Handler invoked with the original event.
 * @param options.enabled - Skip handling when false (default true).
 */
export function useCodeHotkey(
  code: string,
  mods: { ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean },
  callback: (event: KeyboardEvent) => void,
  options: { enabled?: boolean } = {},
) {
  const { enabled = true } = options;
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    function isLatinChar(key: string) {
      return key.length === 1 && /^[A-Za-z]$/.test(key);
    }

    function handler(event: KeyboardEvent) {
      if (event.code !== code) return;
      if (Boolean(event.ctrlKey) !== Boolean(mods.ctrl)) return;
      if (Boolean(event.shiftKey) !== Boolean(mods.shift)) return;
      if (Boolean(event.altKey) !== Boolean(mods.alt)) return;
      if (Boolean(event.metaKey) !== Boolean(mods.meta)) return;
      // Only fire when the key produced by the active layout is NOT a
      // Latin letter. On EN layout `event.key` is "n" / "N" and the
      // tanstack hook already handled it; firing here would duplicate.
      if (isLatinChar(event.key)) return;

      callbackRef.current(event);
    }

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [code, mods.ctrl, mods.shift, mods.alt, mods.meta, enabled]);
}
