import { describe, expect, it } from "vitest";
import { parseAnonId } from "../anon-id";
import { createTRPCContext } from "../trpc";

describe("anonymous id", () => {
  it("accepts only strict UUID v4 values and lower-cases them", () => {
    expect(parseAnonId("3F2504E0-4F89-41D3-9A0C-0305E82C3301")).toBe("3f2504e0-4f89-41d3-9a0c-0305e82c3301");
    expect(parseAnonId(" 3f2504e0-4f89-41d3-9a0c-0305e82c3301 ")).toBe("3f2504e0-4f89-41d3-9a0c-0305e82c3301");
    for (const bad of [
      null,
      undefined,
      "",
      "not-a-uuid",
      "3f2504e0-4f89-11d3-9a0c-0305e82c3301", // v1
      "3f2504e0-4f89-41d3-7a0c-0305e82c3301", // bad variant
      "3f2504e04f8941d39a0c0305e82c3301",
      "3f2504e0-4f89-41d3-9a0c-0305e82c3301x",
      "' OR 1=1 --",
    ]) {
      expect(parseAnonId(bad)).toBeNull();
    }
  });

  it("puts the parsed id on the tRPC context", () => {
    expect(createTRPCContext({ session: null, anonId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301" }).anonId).toBe(
      "3f2504e0-4f89-41d3-9a0c-0305e82c3301"
    );
    expect(createTRPCContext({ session: null, anonId: "nope" }).anonId).toBeNull();
    expect(createTRPCContext({ session: null }).anonId).toBeNull();
  });
});
