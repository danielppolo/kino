import { useState, useEffect } from "react";

interface UseSelectionOptions {
  onSelectionChange?: (selected: string[]) => void;
  getAllIds?: () => string[];
}

export function useSelection(options: UseSelectionOptions = {}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [lastSelected, setLastSelected] = useState<string | null>(null);
  const { onSelectionChange, getAllIds } = options;

  const clearSelection = () => {
    setSelected([]);
    setLastSelected(null);
  };

  const selectAll = () => {
    if (getAllIds) {
      const allIds = getAllIds();
      setSelected(allIds);
      setLastSelected(allIds[allIds.length - 1] || null);
      onSelectionChange?.(allIds);
    }
  };

  const toggleSelection = (id: string, shiftKey = false) => {
    setSelected((prev) => {
      let newSelection = prev;

      if (shiftKey && lastSelected && getAllIds) {
        const ids = getAllIds();
        const start = ids.indexOf(lastSelected);
        const end = ids.indexOf(id);
        if (start !== -1 && end !== -1) {
          const [from, to] = start < end ? [start, end] : [end, start];
          const range = ids.slice(from, to + 1);
          const set = new Set(prev);
          range.forEach((r) => set.add(r));
          newSelection = Array.from(set);
          onSelectionChange?.(newSelection);
          return newSelection;
        }
      }

      const exists = prev.includes(id);
      if (exists) {
        newSelection = prev.filter((itemId) => itemId !== id);
      } else {
        newSelection = [...prev, id];
      }
      onSelectionChange?.(newSelection);
      return newSelection;
    });
    setLastSelected(id);
  };

  const addToSelection = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev;
      const newSelection = [...prev, id];
      onSelectionChange?.(newSelection);
      return newSelection;
    });
    setLastSelected(id);
  };

  const removeFromSelection = (id: string) => {
    setSelected((prev) => {
      const newSelection = prev.filter((itemId) => itemId !== id);
      onSelectionChange?.(newSelection);
      return newSelection;
    });
    setLastSelected(null);
  };

  const setSelection = (ids: string[]) => {
    setSelected(ids);
    setLastSelected(ids[ids.length - 1] || null);
    onSelectionChange?.(ids);
  };

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
