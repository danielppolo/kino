import { useState, useEffect, useCallback } from "react";

interface UseSelectionOptions {
  onSelectionChange?: (selected: string[]) => void;
}

export function useSelection(options: UseSelectionOptions = {}) {
  const [selected, setSelected] = useState<string[]>([]);
  const { onSelectionChange } = options;

  const clearSelection = useCallback(() => {
    setSelected([]);
  }, []);

  const toggleSelection = useCallback(
    (id: string) => {
      setSelected((prev) => {
        const exists = prev.includes(id);
        if (exists) {
          const newSelection = prev.filter((itemId) => itemId !== id);
          onSelectionChange?.(newSelection);
          return newSelection;
        } else {
          const newSelection = [...prev, id];
          onSelectionChange?.(newSelection);
          return newSelection;
        }
      });
    },
    [onSelectionChange],
  );

  const addToSelection = useCallback(
    (id: string) => {
      setSelected((prev) => {
        if (prev.includes(id)) return prev;
        const newSelection = [...prev, id];
        onSelectionChange?.(newSelection);
        return newSelection;
      });
    },
    [onSelectionChange],
  );

  const removeFromSelection = useCallback(
    (id: string) => {
      setSelected((prev) => {
        const newSelection = prev.filter((itemId) => itemId !== id);
        onSelectionChange?.(newSelection);
        return newSelection;
      });
    },
    [onSelectionChange],
  );

  const setSelection = useCallback(
    (ids: string[]) => {
      setSelected(ids);
      onSelectionChange?.(ids);
    },
    [onSelectionChange],
  );

  // Handle escape key to clear selection
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && selected.length > 0) {
        clearSelection();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selected.length, clearSelection]);

  return {
    selected,
    selectedCount: selected.length,
    clearSelection,
    toggleSelection,
    addToSelection,
    removeFromSelection,
    setSelection,
  };
}
