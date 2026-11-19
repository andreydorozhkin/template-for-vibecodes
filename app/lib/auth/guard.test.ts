import { describe, expect, it } from "vitest";
import { redirectTarget } from "./guard";

describe("redirectTarget", () => {
  it("sends an anonymous visitor away from notes", () => {
    expect(redirectTarget("/notes", false)).toBe("/login");
    expect(redirectTarget("/notes/1", false)).toBe("/login");
  });

  it("leaves the login page available to an anonymous visitor", () => {
    expect(redirectTarget("/login", false)).toBeNull();
  });

  it("sends a signed-in user from login to notes", () => {
    expect(redirectTarget("/login", true)).toBe("/notes");
    expect(redirectTarget("/notes", true)).toBeNull();
  });
});
