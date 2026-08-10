import * as chrono from "chrono-node";
import { format } from "date-fns";

import type { OntologyAssociationItem } from "./ontology-associations";

type InlineDescriptionSelections = {
  categoryName?: string;
  date?: string;
  labelName?: string;
  ontologyAssociations: Array<Pick<OntologyAssociationItem, "name">>;
};

function removeInlineToken(value: string, token: string) {
  let nextValue = value;
  let index = nextValue.indexOf(token);

  while (index >= 0) {
    const before = nextValue[index - 1];
    const after = nextValue[index + token.length];
    if ((!before || /\s/.test(before)) && (!after || /\s/.test(after))) {
      const removeStart = index > 0 && before === " " ? index - 1 : index;
      const removeEnd =
        after === " " ? index + token.length + 1 : index + token.length;
      const separator =
        removeStart > 0 && removeEnd < nextValue.length ? " " : "";
      nextValue = `${nextValue.slice(0, removeStart)}${separator}${nextValue.slice(removeEnd)}`;
      index = nextValue.indexOf(token, removeStart + separator.length);
      continue;
    }
    index = nextValue.indexOf(token, index + token.length);
  }

  return nextValue;
}

export function stripInlineDescriptionSelections(
  description: string | undefined,
  selections: InlineDescriptionSelections,
  referenceDate = new Date(),
) {
  if (!description) return description;

  const tokens = [
    ...selections.ontologyAssociations.map(({ name }) => `@${name}`),
    selections.labelName ? `#${selections.labelName}` : undefined,
    selections.categoryName ? `$${selections.categoryName}` : undefined,
    selections.date
      ? `!${format(new Date(`${selections.date}T00:00:00`), "EEEE, MMMM d")}`
      : undefined,
  ].filter((token): token is string => Boolean(token));

  let cleanedDescription = tokens.reduce(removeInlineToken, description);
  const trailingDate = chrono.casual
    .parse(cleanedDescription, referenceDate, { forwardDate: true })
    .at(-1);

  if (trailingDate && selections.date) {
    const trailingDateEnd = trailingDate.index + trailingDate.text.length;
    const isTrailing = trailingDateEnd === cleanedDescription.trimEnd().length;
    const matchesSelection =
      format(trailingDate.start.date(), "yyyy-MM-dd") === selections.date;
    if (isTrailing && matchesSelection) {
      cleanedDescription = `${cleanedDescription.slice(0, trailingDate.index)}${cleanedDescription.slice(trailingDateEnd)}`;
    }
  }

  return cleanedDescription.trim();
}
