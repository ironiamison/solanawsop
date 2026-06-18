"use client";

import { Suspense, type ReactNode } from "react";
import { TutorialProvider } from "./TutorialProvider";

export default function TutorialRoot({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={children}>
      <TutorialProvider>{children}</TutorialProvider>
    </Suspense>
  );
}
