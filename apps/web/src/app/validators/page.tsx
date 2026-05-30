import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query/client";
import { queryKeys } from "@/lib/query/keys";
import { getValidators } from "@/lib/api/validators";
import { ValidatorsView } from "./validators-view";

export const revalidate = 30;

const PARAMS = { sort: "weight", order: "desc", limit: 200 } as const;

export default async function ValidatorsPage() {
  const qc = getQueryClient();
  await qc.prefetchQuery({
    queryKey: queryKeys.validators(PARAMS),
    queryFn: () => getValidators(PARAMS),
  });

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <ValidatorsView />
    </HydrationBoundary>
  );
}
