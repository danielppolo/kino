export function isEditableElement(element: Element | null) {
  if (!element) return false;

  const htmlElement = element as HTMLElement;
  const tagName = htmlElement.tagName.toLowerCase();

  if (["input", "textarea", "select", "option"].includes(tagName)) {
    return true;
  }

  if (htmlElement.isContentEditable) {
    return true;
  }

  if (htmlElement.getAttribute("role") === "textbox") {
    return true;
  }

  return Boolean(htmlElement.closest("form"));
}

export function isDialogOpen() {
  if (typeof document === "undefined") return false;
  return Boolean(document.querySelector('[role="dialog"][data-state="open"]'));
}

export function canUseGlobalShortcuts({
  formOpen = false,
}: {
  formOpen?: boolean;
} = {}) {
  if (formOpen) return false;
  if (typeof document === "undefined") return false;
  if (isDialogOpen()) return false;
  if (isEditableElement(document.activeElement)) return false;
  return true;
}
