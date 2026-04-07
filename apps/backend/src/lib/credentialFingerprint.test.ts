import { describe, expect, it } from "bun:test";

import { credentialFingerprint } from "./credentialFingerprint";

describe("credentialFingerprint", () => {
  it("returns a 16-char hex prefix stable for the same PAT", () => {
    const a = credentialFingerprint("pat-one");
    const b = credentialFingerprint("pat-one");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
  });

  it("differs for different PATs", () => {
    expect(credentialFingerprint("a")).not.toBe(credentialFingerprint("b"));
  });
});
