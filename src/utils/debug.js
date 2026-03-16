export const DEBUG = import.meta.env.DEV;

export function logDebug(label, payload) {
  if (!DEBUG) return;
  console.info(label, payload);
}
