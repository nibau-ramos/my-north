const store = new Map<string, number>();

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

export function touch(userId: string): void {
  store.set(userId, Date.now());
}

export function isOnline(userId: string): boolean {
  const ts = store.get(userId);
  return ts != null && Date.now() - ts < ONLINE_THRESHOLD_MS;
}
