export const DEBUG = true;

export function logDebug(label, payload) {
  if (!DEBUG) return;
  // eslint-disable-next-line no-console
  console.info(label, payload);
}
