export type Theme = "dark" | "light"

export const THEME_STORAGE_KEY = "ravedeprinz-theme"

function normalizeTheme(theme: Theme): Theme {
  return theme === "light" ? "light" : "dark"
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function getTheme(): Theme {
  if (typeof document === "undefined" || !document.documentElement) {
    return "dark"
  }

  try {
    return document.documentElement.getAttribute("data-theme") === "light"
      ? "light"
      : "dark"
  } catch {
    return "dark"
  }
}

export function setTheme(theme: Theme): Theme {
  const normalizedTheme = normalizeTheme(theme)

  if (typeof document === "undefined" || !document.documentElement) {
    return normalizedTheme
  }

  document.documentElement.setAttribute("data-theme", normalizedTheme)

  try {
    getStorage()?.setItem(THEME_STORAGE_KEY, normalizedTheme)
  } catch {
    // Theme changes remain active for this session if persistence is unavailable.
  }

  return normalizedTheme
}

export function toggleTheme(): Theme {
  const nextTheme: Theme = getTheme() === "dark" ? "light" : "dark"
  return setTheme(nextTheme)
}
