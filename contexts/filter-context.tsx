"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";

// Utility function to update URL params without reloading
const updateUrlParams = (key: string, value: string | undefined) => {
  const url = new URL(window.location.href);
  if (value) {
    url.searchParams.set(key, value);
  } else {
    url.searchParams.delete(key);
  }
  window.history.replaceState(null, "", url.toString());
};

type Range = {
  to: Date | undefined;
  from: Date | undefined;
};

export interface Filters {
  label_id: string | undefined;
  category_id: string | undefined;
  dateRange: Range;
  wallet_id: string | undefined;
}

// Define the possible actions for the reducer
type FilterAction =
  | { type: "SET_CATEGORY_ID"; payload: string | undefined }
  | { type: "SET_SUBJECT_ID"; payload: string | undefined }
  | { type: "SET_DATE_RANGE"; payload: Range }
  | { type: "SET_WALLET_ID"; payload: string | undefined };

// Define the reducer function
const filterReducer = (state: Filters, action: FilterAction): Filters => {
  switch (action.type) {
    case "SET_CATEGORY_ID":
      return { ...state, label_id: action.payload };
    case "SET_SUBJECT_ID":
      return { ...state, category_id: action.payload };
    case "SET_DATE_RANGE":
      return { ...state, dateRange: action.payload };
    case "SET_WALLET_ID":
      return { ...state, wallet_id: action.payload };
    default:
      return state;
  }
};

// Create the FilterContext
const FilterContext = createContext<
  | {
      filters: Filters;
      setLabelId: (label_id: string | undefined) => void;
      setCategoryId: (category_id: string | undefined) => void;
      setDateRange: (range: Range) => void;
      setWalletId: (wallet_id: string | undefined) => void;
    }
  | undefined
>(undefined);

// Provider to wrap the app and provide filter state
export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const searchParams = new URLSearchParams(window.location.search);
  const [filters, dispatch] = useReducer(filterReducer, {
    label_id: searchParams.get("label_id") || undefined,
    category_id: searchParams.get("category_id") || undefined,
    dateRange: {
      from: searchParams.get("from")
        ? new Date(searchParams.get("from") as string)
        : undefined,
      to: searchParams.get("to")
        ? new Date(searchParams.get("to") as string)
        : undefined,
    },
    wallet_id: searchParams.get("wallet_id") || undefined,
  });

  const setters = useMemo(
    () => ({
      setLabelId: (label_id: string | undefined) =>
        dispatch({ type: "SET_CATEGORY_ID", payload: label_id }),

      setCategoryId: (category_id: string | undefined) =>
        dispatch({ type: "SET_SUBJECT_ID", payload: category_id }),

      setDateRange: (range: Range) =>
        dispatch({ type: "SET_DATE_RANGE", payload: range }),

      setWalletId: (wallet_id: string | undefined) =>
        dispatch({ type: "SET_WALLET_ID", payload: wallet_id }),
    }),
    [],
  );

  // Sync filter changes with URL query params
  useEffect(() => {
    updateUrlParams("label_id", filters.label_id);
    updateUrlParams("category_id", filters.category_id);
    updateUrlParams("from", filters.dateRange.from?.toISOString());
    updateUrlParams("to", filters.dateRange.to?.toISOString());
    updateUrlParams("wallet_id", filters.wallet_id);
  }, [filters]);

  return (
    <FilterContext.Provider
      value={{
        filters,
        ...setters,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
};

// Custom hook to use filter context
export const useFilter = () => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error("useFilter must be used within a FilterProvider");
  }
  return context;
};
