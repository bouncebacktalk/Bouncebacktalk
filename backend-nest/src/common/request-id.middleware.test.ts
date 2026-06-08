import { describe, expect, it } from "vitest";
import { requestIdFromHeader } from "./request-id.middleware";

describe("requestIdFromHeader", () => {
  it("accepts a safe incoming request id", () => {
    expect(requestIdFromHeader("client-123")).toBe("client-123");
  });

  it("uses the first header value when a proxy sends multiple values", () => {
    expect(requestIdFromHeader(["client-123", "client-456"])).toBe(
      "client-123",
    );
  });

  it("generates an id when the header is missing or unsafe", () => {
    expect(requestIdFromHeader(undefined)).toMatch(/^req_[\w-]+/);
    expect(requestIdFromHeader("bad value with spaces")).toMatch(/^req_[\w-]+/);
  });
});
