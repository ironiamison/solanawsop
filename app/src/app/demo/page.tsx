import { Suspense } from "react";
import DemoPageClient from "./DemoPageClient";
import LoadingLobby from "@/components/loading/LoadingLobby";

export default function DemoPage() {
  return (
    <Suspense
      fallback={
        <LoadingLobby subtitle="Loading demo table…" tablesActive={1} />
      }
    >
      <DemoPageClient />
    </Suspense>
  );
}
