export type ResearchRouteResult<T> =
  | { status: 200; body: T }
  | { status: 404 | 503; body: { error: string }; cause?: unknown };

export async function resolveResearchRouteResult<T>(
  load: () => Promise<T | null>,
  messages: { notFound: string; unavailable: string },
): Promise<ResearchRouteResult<T>> {
  try {
    const payload = await load();
    return payload
      ? { status: 200, body: payload }
      : { status: 404, body: { error: messages.notFound } };
  } catch (cause) {
    return {
      status: 503,
      body: { error: messages.unavailable },
      cause,
    };
  }
}
