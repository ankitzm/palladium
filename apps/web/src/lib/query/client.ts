import {
  isServer,
  QueryClient,
  defaultShouldDehydrateQuery,
} from "@tanstack/react-query";

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Mirror the old ISR window: data is fresh for 30s, so a client mount
        // right after server prefetch won't immediately refetch.
        staleTime: 30 * 1000,
        refetchOnWindowFocus: false,
      },
      dehydrate: {
        // Include pending queries so streamed prefetches hydrate too.
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

// Server: always a fresh client per request. Browser: a singleton so cache and
// in-flight requests survive re-renders and Suspense.
export function getQueryClient(): QueryClient {
  if (isServer) return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}
