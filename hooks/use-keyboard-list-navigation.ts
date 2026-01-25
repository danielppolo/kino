import { useEffect, useState } from "react";

import { canUseGlobalShortcuts } from "@/utils/keyboard-shortcuts";

interface KeyboardListNavigationOptions<T> {
  items: T[];
  getItemId: (item: T) => string;
  onEnter?: (item: T) => void;
  onSpace?: (item: T) => void;
  onSelectAll?: () => void;
  enabled?: boolean;
}

export function useKeyboardListNavigation<T>({
  items,
  getItemId,
  onEnter,
  onSpace,
  onSelectAll,
  enabled = true,
}: KeyboardListNavigationOptions<T>) {
  const [activeIndex, setActiveIndex] = useState(-1);

  const itemIds = items.map((item) => getItemId(item));

  const indexById = new Map(itemIds.map((id, index) => [id, index]));

  const setActiveId = (id: string | null) => {
    if (!id) {
      setActiveIndex(-1);
      return;
    }
    const index = indexById.get(id);
    if (typeof index === "number") {
      setActiveIndex(index);
    }
  };

  const activeItem = activeIndex >= 0 ? items[activeIndex] : undefined;
  const activeId = activeItem ? getItemId(activeItem) : null;

  useEffect(() => {
    if (!items.length) {
      setActiveIndex(-1);
      return;
    }
    setActiveIndex((prev) => {
      if (prev < 0) return 0;
      if (prev >= items.length) return items.length - 1;
      return prev;
    });
  }, [items.length]);

  useEffect(() => {
    if (!enabled) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!canUseGlobalShortcuts()) return;
      if (!items.length) return;

      if (event.metaKey && !event.ctrlKey && !event.altKey) {
        if (event.key.toLowerCase() === "a" && onSelectAll) {
          event.preventDefault();
          onSelectAll();
        }
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((prev) => {
          const nextIndex =
            event.key === "ArrowDown"
              ? Math.min(Math.max(prev, 0) + 1, items.length - 1)
              : Math.max(prev > 0 ? prev - 1 : 0, 0);
          return nextIndex;
        });
        return;
      }

      if (event.key === "Enter" && onEnter) {
        if (!activeItem) return;
        event.preventDefault();
        onEnter(activeItem);
        return;
      }

      if ((event.key === " " || event.code === "Space") && onSpace) {
        if (!activeItem) return;
        event.preventDefault();
        onSpace(activeItem);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeItem, enabled, items.length, onEnter, onSelectAll, onSpace]);

  return {
    activeId,
    activeItem,
    setActiveId,
  };
}
