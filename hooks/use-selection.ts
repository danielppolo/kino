import { useState, useEffect, useCallback } from "react";

interface UseSelectionOptions {
  onSelectionChange?: (selected: string[]) => void;
  getAllIds?: () => string[];
}

export function useSelection(options: UseSelectionOptions = {}) {
  const [selected, setSelected] = useState<string[]>([]);
  const { onSelectionChange, getAllIds } = options;

  const clearSelection = useCallback(() => {
    setSelected([]);
  }, []);

  const selectAll = useCallback(() => {
    if (getAllIds) {
      const allIds = getAllIds();
      setSelected(allIds);
      onSelectionChange?.(allIds);
    }
  }, [getAllIds, onSelectionChange]);

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

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && selected.length > 0) {
        clearSelection();
      }

      // Handle Ctrl+A (Windows/Linux) or Cmd+A (Mac) to select all
      // FIXME: Enable this
      // if (event.key === "w") {
      //   event.preventDefault();
      //   selectAll();
      // }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selected.length, clearSelection, selectAll]);

  return {
    selected,
    selectedCount: selected.length,
    clearSelection,
    toggleSelection,
    addToSelection,
    removeFromSelection,
    setSelection,
    selectAll,
  };
}
