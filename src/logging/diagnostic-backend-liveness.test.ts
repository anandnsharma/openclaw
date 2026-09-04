// Backend-declared quiet allowances reaching stuck-session recovery.
import { afterEach, describe, expect, it } from "vitest";
import {
  clearDiagnosticBackendLivenessDeadline,
  markDiagnosticBackendLivenessDeadline,
  resolveDiagnosticBackendLivenessTimeoutMs,
} from "./diagnostic-backend-liveness.js";

const declaredRefs = [{ sessionId: "s1", sessionKey: "agent:main:main" }, { sessionId: "quiet" }];

afterEach(() => {
  for (const ref of declaredRefs) {
    clearDiagnosticBackendLivenessDeadline(ref);
  }
});

describe("backend liveness deadlines", () => {
  const ref = { sessionId: "s1", sessionKey: "agent:main:main" };

  it("is readable before the backend has produced any output", () => {
    // The quiet-from-start case: nothing has streamed yet, and that is exactly
    // the window the allowance has to cover.
    markDiagnosticBackendLivenessDeadline(ref, 480_000);

    expect(resolveDiagnosticBackendLivenessTimeoutMs(ref)).toBe(480_000);
    expect(resolveDiagnosticBackendLivenessTimeoutMs({ sessionId: "s1" })).toBe(480_000);
    expect(resolveDiagnosticBackendLivenessTimeoutMs({ sessionKey: "agent:main:main" })).toBe(
      480_000,
    );
  });

  it("does not outlive the process that declared it", () => {
    markDiagnosticBackendLivenessDeadline(ref, 480_000);
    clearDiagnosticBackendLivenessDeadline(ref);

    expect(resolveDiagnosticBackendLivenessTimeoutMs(ref)).toBeUndefined();
  });

  it("reports the widest allowance and ignores non-positive ones", () => {
    markDiagnosticBackendLivenessDeadline({ sessionId: "s1" }, 300_000);
    markDiagnosticBackendLivenessDeadline({ sessionKey: "agent:main:main" }, 600_000);
    markDiagnosticBackendLivenessDeadline({ sessionId: "quiet" }, 0);

    expect(resolveDiagnosticBackendLivenessTimeoutMs(ref)).toBe(600_000);
    expect(resolveDiagnosticBackendLivenessTimeoutMs({ sessionId: "quiet" })).toBeUndefined();
  });

  it("leaves an unknown session without an allowance", () => {
    expect(resolveDiagnosticBackendLivenessTimeoutMs({ sessionId: "absent" })).toBeUndefined();
  });
});
