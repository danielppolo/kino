import { describe, expect, it } from "vitest";

import {
  getAmountFormValue,
  normalizeAmountFormValue,
} from "./amount-form-value";

describe("getAmountFormValue", () => {
  it("uses an empty value when there is no amount", () => {
    expect(getAmountFormValue()).toBe("");
    expect(getAmountFormValue(null)).toBe("");
  });

  it("preserves numeric amounts", () => {
    expect(getAmountFormValue(0)).toBe(0);
    expect(getAmountFormValue(12.34)).toBe(12.34);
  });

  it("normalizes submitted amount values to numbers", () => {
    expect(normalizeAmountFormValue("")).toBe(0);
    expect(normalizeAmountFormValue(12.34)).toBe(12.34);
  });
});
