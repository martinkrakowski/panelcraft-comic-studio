/**
 * Utility type to filter out semantic state attributes from presentation props.
 * This prevents data fetching, loading, or network-bound state from leaking directly into UI.
 */
export type NoSemanticState<T> = Omit<
  T,
  "data" | "loading" | "error" | "isLoading" | "isError" | "status" | "fetching" | "mutating"
>;
