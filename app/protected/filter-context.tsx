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

// Define the shape of the filter state
interface Filters {
  category_id: string | undefined;
  subject_id: string | undefined;
  from: string | undefined;
  to: string | undefined;
  wallet_id: string | undefined;
}

// Define the possible actions for the reducer
type FilterAction =
  | { type: "SET_CATEGORY_ID"; payload: string | undefined }
  | { type: "SET_SUBJECT_ID"; payload: string | undefined }
  | { type: "SET_FROM"; payload: string | undefined }
  | { type: "SET_TO"; payload: string | undefined }
  | { type: "SET_WALLET_ID"; payload: string | undefined };

// Define the reducer function
const filterReducer = (state: Filters, action: FilterAction): Filters => {
  switch (action.type) {
    case "SET_CATEGORY_ID":
      return { ...state, category_id: action.payload };
    case "SET_SUBJECT_ID":
      return { ...state, subject_id: action.payload };
    case "SET_FROM":
      return { ...state, from: action.payload };
    case "SET_TO":
      return { ...state, to: action.payload };
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
      setCategoryId: (category_id: string | undefined) => void;
      setSubjectId: (subject_id: string | undefined) => void;
      setFrom: (from: string | undefined) => void;
      setTo: (to: string | undefined) => void;
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
    category_id: searchParams.get("category_id") || undefined,
    subject_id: searchParams.get("subject_id") || undefined,
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
    wallet_id: searchParams.get("wallet_id") || undefined,
  });

  const setters = useMemo(
    () => ({
      setCategoryId: (category_id: string | undefined) =>
        dispatch({ type: "SET_CATEGORY_ID", payload: category_id }),

      setSubjectId: (subject_id: string | undefined) =>
        dispatch({ type: "SET_SUBJECT_ID", payload: subject_id }),

      setFrom: (from: string | undefined) =>
        dispatch({ type: "SET_FROM", payload: from }),

      setTo: (to: string | undefined) =>
        dispatch({ type: "SET_TO", payload: to }),

      setWalletId: (wallet_id: string | undefined) =>
        dispatch({ type: "SET_WALLET_ID", payload: wallet_id }),
    }),
    [],
  );

  // Sync filter changes with URL query params
  useEffect(() => {
    updateUrlParams("category_id", filters.category_id);
    updateUrlParams("subject_id", filters.subject_id);
    updateUrlParams("from", filters.from);
    updateUrlParams("to", filters.to);
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
