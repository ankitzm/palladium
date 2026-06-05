import { ApiDocsView } from "./api-docs-view";

export const metadata = {
  title: "API reference · Palladium",
  description:
    "Public, key-less REST API for Avalanche L1 data — chains, validators, metrics and overview stats.",
};

export default function ApiDocsPage() {
  return <ApiDocsView />;
}
