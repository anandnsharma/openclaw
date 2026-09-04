/** Liveness deadlines declared by the backend executing a session's work. */

// Keyed by every ref the executing backend can name itself with, because
// recovery may observe a session by id or by key. Entries are owned by the
// process that declared them and released when that process settles, so this
// map tracks live children only.
const deadlinesByRef = new Map<string, number>();

export type BackendLivenessRef = { sessionId?: string; sessionKey?: string };

function refKeys(ref: BackendLivenessRef): string[] {
  const keys: string[] = [];
  const sessionId = ref.sessionId?.trim();
  const sessionKey = ref.sessionKey?.trim();
  if (sessionId) {
    keys.push(`id:${sessionId}`);
  }
  if (sessionKey) {
    keys.push(`key:${sessionKey}`);
  }
  return keys;
}

/**
 * Publishes the quiet allowance the backend already enforces, at the moment it
 * starts its own timer rather than on first output. A backend permitted to stay
 * silent has produced nothing yet, and this deadline is exactly what stops
 * generic stuck-session recovery reclaiming it inside that allowance.
 */
export function markDiagnosticBackendLivenessDeadline(
  ref: BackendLivenessRef,
  timeoutMs: number,
): void {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return;
  }
  for (const key of refKeys(ref)) {
    deadlinesByRef.set(key, timeoutMs);
  }
}

/** Releases the allowance once its declaring process settles. */
export function clearDiagnosticBackendLivenessDeadline(ref: BackendLivenessRef): void {
  for (const key of refKeys(ref)) {
    deadlinesByRef.delete(key);
  }
}

/** Widest allowance any backend currently declares for this session. */
export function resolveDiagnosticBackendLivenessTimeoutMs(
  ref: BackendLivenessRef,
): number | undefined {
  let widest: number | undefined;
  for (const key of refKeys(ref)) {
    const declared = deadlinesByRef.get(key);
    if (declared !== undefined && (widest === undefined || declared > widest)) {
      widest = declared;
    }
  }
  return widest;
}
