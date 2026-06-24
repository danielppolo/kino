import { describe, expect, it } from "vitest";

import { getAdjacentDateValue } from "./date-picker-utils";

describe("getAdjacentDateValue", () => {
  it("moves by one day for normal previous and next clicks", () => {
    expect(getAdjacentDateValue("2026-06-23", "previous", false)).toBe(
      "2026-06-22",
    );
    expect(getAdjacentDateValue("2026-06-23", "next", false)).toBe(
      "2026-06-24",
    );
  });

  it("moves by one month for shift previous and next clicks", () => {
    expect(getAdjacentDateValue("2026-06-23", "previous", true)).toBe(
      "2026-05-23",
    );
    expect(getAdjacentDateValue("2026-06-23", "next", true)).toBe(
      "2026-07-23",
    );
  });
});
