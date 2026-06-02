import { vi } from "vitest";

type AnyFunction = (...args: never[]) => unknown;

export function unstableCachePassThrough<TFunction extends AnyFunction>(
  callback: TFunction,
): TFunction {
  return callback;
}

export function mockNextCache() {
  vi.doMock("next/cache", () => ({
    unstable_cache: unstableCachePassThrough,
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
    unstable_noStore: vi.fn(),
  }));
}
