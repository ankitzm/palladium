import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query/client";
import { queryKeys } from "@/lib/query/keys";
import { getChainBySlug } from "@/lib/api/chains";
import { getMetricsHistory } from "@/lib/api/metrics";
import { ChainDetailView } from "./detail-view";

export const revalidate = 30;

const DAYS = 30;

export default async function ChainDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const qc = getQueryClient();

  await Promise.all([
    qc.prefetchQuery({
      queryKey: queryKeys.chainDetail(slug),
      queryFn: () => getChainBySlug(slug),
    }),
    qc
      .prefetchQuery({
        queryKey: queryKeys.metrics(slug, DAYS),
        queryFn: () => getMetricsHistory(slug, DAYS),
      })
      .catch(() => undefined),
  ]);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <ChainDetailView slug={slug} days={DAYS} />
    </HydrationBoundary>
  );
}
