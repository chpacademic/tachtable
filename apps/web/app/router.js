const HASH_PREFIX = "#/";

export function normalizeScreenHash(hashValue = "") {
  return String(hashValue || "").replace(/^#\/?/, "").trim();
}

export function createRouter({ screens = [], defaultScreen = "" } = {}) {
  const screenSet = new Set(screens);

  function resolve(hashValue = globalThis.window?.location?.hash || "") {
    const raw = normalizeScreenHash(hashValue);
    return screenSet.has(raw) ? raw : defaultScreen;
  }

  function build(screen) {
    const nextScreen = screenSet.has(screen) ? screen : defaultScreen;
    return `${HASH_PREFIX}${nextScreen}`;
  }

  function navigate(screen, targetWindow = globalThis.window) {
    const nextHash = build(screen);
    if (targetWindow?.location && targetWindow.location.hash !== nextHash) {
      targetWindow.location.hash = nextHash;
      return false;
    }
    return true;
  }

  return {
    screens: screenSet,
    defaultScreen,
    resolve,
    build,
    navigate,
  };
}
