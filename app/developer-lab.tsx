import { Redirect } from "expo-router";

import { PageCurlProofScreen } from "@/developer-lab/page-curl-proof-screen";

export default function DeveloperLabRoute() {
  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  return <PageCurlProofScreen />;
}
