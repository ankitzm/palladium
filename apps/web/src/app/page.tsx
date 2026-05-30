import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query/client";
import { queryKeys } from "@/lib/query/keys";
import { getOverview } from "@/lib/api/overview";
import { OverviewView } from "./overview-view";

// ISR: re-render (and re-prefetch) at most every 30s, mirroring the old fetch
// revalidate window. Avoids hitting the API/DB on every request.
export const revalidate = 30;

export default async function OverviewPage() {
  const qc = getQueryClient();
  await qc.prefetchQuery({
    queryKey: queryKeys.overview(),
    queryFn: getOverview,
  });

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <OverviewView />
    </HydrationBoundary>
  );
}
