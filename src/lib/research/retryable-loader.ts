export interface RetryableLoader<T> {
  load: () => Promise<T>;
  reset: () => void;
}

export function createRetryableLoader<T>(
  importer: () => Promise<T>,
): RetryableLoader<T> {
  let pending: Promise<T> | null = null;

  return {
    load() {
      if (pending) return pending;

      const request = importer().catch((error: unknown) => {
        if (pending === request) pending = null;
        throw error;
      });
      pending = request;
      return request;
    },
    reset() {
      pending = null;
    },
  };
}
