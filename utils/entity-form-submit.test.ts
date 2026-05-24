import { describe, expect, it, vi } from "vitest";

import { runEntityFormSubmit } from "./entity-form-submit";

describe("runEntityFormSubmit", () => {
  it("closes immediately and reopens when a non-add-another submit fails", async () => {
    let settleSubmit: (value: { error?: string }) => void = () => {};
    const submitPromise = new Promise<{ error?: string }>((resolve) => {
      settleSubmit = resolve;
    });
    const onOpenChange = vi.fn();
    const onBeforeErrorReopen = vi.fn();

    const resultPromise = runEntityFormSubmit({
      addAnother: false,
      onBeforeErrorReopen,
      onOpenChange,
      onSubmit: () => submitPromise,
      values: { description: "Dinner" },
    });

    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);

    settleSubmit({ error: "Failed to create transaction" });
    await expect(resultPromise).resolves.toEqual({
      error: "Failed to create transaction",
    });

    expect(onOpenChange).toHaveBeenCalledTimes(2);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(onBeforeErrorReopen).toHaveBeenCalledWith({
      description: "Dinner",
    });
    expect(onBeforeErrorReopen.mock.invocationCallOrder[0]).toBeLessThan(
      onOpenChange.mock.invocationCallOrder[1],
    );
  });

  it("does not close immediately when add-another is enabled", async () => {
    const onOpenChange = vi.fn();

    await runEntityFormSubmit({
      addAnother: true,
      onOpenChange,
      onSubmit: async () => ({ error: undefined }),
      values: { description: "Dinner" },
    });

    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
