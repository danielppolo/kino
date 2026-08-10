import { describe, expect, it } from "vitest";

import { stripInlineDescriptionSelections } from "./transaction-description";

describe("stripInlineDescriptionSelections", () => {
  it("keeps only free text when all inline selections are present", () => {
    expect(
      stripInlineDescriptionSelections(
        "Burning Man @Jena Bautmans $Reembolso #Comunidad yesterday",
        {
          categoryName: "Reembolso",
          date: "2026-08-09",
          labelName: "Comunidad",
          ontologyAssociations: [{ name: "Jena Bautmans" }],
        },
        new Date("2026-08-10T12:00:00"),
      ),
    ).toBe("Burning Man");
  });

  it("removes a formatted date selection and preserves unrelated text", () => {
    expect(
      stripInlineDescriptionSelections(
        "!Sunday, August 9 Move money #Savings",
        {
          date: "2026-08-09",
          labelName: "Savings",
          ontologyAssociations: [],
        },
      ),
    ).toBe("Move money");
  });

  it("does not remove text that merely contains a selected token", () => {
    expect(
      stripInlineDescriptionSelections("Email@Jena Bautmans.com", {
        ontologyAssociations: [{ name: "Jena Bautmans" }],
      }),
    ).toBe("Email@Jena Bautmans.com");
  });
});
