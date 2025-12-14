import {
  HISTORY_STORAGE_KEY,
  MAX_HISTORY_ITEMS,
  OUTPUT_MODE_STORAGE_KEY,
} from "@/constants";

function safeParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function getStoredHistory() {
  try {
    const stored = safeParseJson(localStorage.getItem(HISTORY_STORAGE_KEY));
    return Array.isArray(stored) ? stored.slice(0, MAX_HISTORY_ITEMS) : [];
  } catch {
    return [];
  }
}

export function getStoredOutputMode() {
  try {
    const stored = safeParseJson(localStorage.getItem(OUTPUT_MODE_STORAGE_KEY));
    return stored === "exact" || stored === "numeric" ? stored : "exact";
  } catch {
    return "exact";
  }
}

export function persistOutputMode(outputMode) {
  localStorage.setItem(OUTPUT_MODE_STORAGE_KEY, JSON.stringify(outputMode));
}

export function persistHistory(history) {
  localStorage.setItem(
    HISTORY_STORAGE_KEY,
    JSON.stringify(history.slice(0, MAX_HISTORY_ITEMS)),
  );
}
