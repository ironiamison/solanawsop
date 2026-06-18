"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  SITE_TUTORIAL_STEPS,
  TUTORIAL_ACTIVE_KEY,
  TUTORIAL_STORAGE_KEY,
  type TutorialStep,
} from "@/lib/tutorial/steps";
import SiteTutorialOverlay from "./SiteTutorialOverlay";

type TutorialContextValue = {
  isActive: boolean;
  stepIndex: number;
  step: TutorialStep | null;
  totalSteps: number;
  completed: boolean;
  startTutorial: (fromStep?: number) => void;
  skipTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  completeTutorial: () => void;
};

const TutorialContext = createContext<TutorialContextValue | null>(null);

function readCompleted(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function TutorialProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [completed, setCompleted] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const done = readCompleted();
    setCompleted(done);
    try {
      const resume = localStorage.getItem(TUTORIAL_ACTIVE_KEY) === "1" && !done;
      if (resume) {
        setIsActive(true);
        setStepIndex(0);
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  const step = isActive ? SITE_TUTORIAL_STEPS[stepIndex] ?? null : null;
  const totalSteps = SITE_TUTORIAL_STEPS.length;

  const navigateToStep = useCallback(
    (index: number) => {
      const target = SITE_TUTORIAL_STEPS[index];
      if (!target) return;
      const [path, hash] = target.route.split("#");
      const qs = path.includes("?") ? path.slice(path.indexOf("?")) : "";
      const base = path.split("?")[0] || "/";
      if (pathname !== base || qs) {
        router.push(target.route);
      } else if (hash) {
        window.location.hash = hash;
      }
    },
    [pathname, router]
  );

  const completeTutorial = useCallback(() => {
    try {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, "1");
      localStorage.removeItem(TUTORIAL_ACTIVE_KEY);
    } catch {
      // ignore
    }
    setCompleted(true);
    setIsActive(false);
    setStepIndex(0);
  }, []);

  const startTutorial = useCallback(
    (fromStep = 0) => {
      try {
        localStorage.setItem(TUTORIAL_ACTIVE_KEY, "1");
        localStorage.removeItem(TUTORIAL_STORAGE_KEY);
      } catch {
        // ignore
      }
      setCompleted(false);
      setIsActive(true);
      setStepIndex(fromStep);
      navigateToStep(fromStep);
    },
    [navigateToStep]
  );

  const skipTutorial = useCallback(() => {
    completeTutorial();
  }, [completeTutorial]);

  const nextStep = useCallback(() => {
    const current = SITE_TUTORIAL_STEPS[stepIndex];
    if (current?.finale) {
      completeTutorial();
      router.push(current.route);
      return;
    }
    const next = stepIndex + 1;
    if (next >= SITE_TUTORIAL_STEPS.length) {
      completeTutorial();
      return;
    }
    setStepIndex(next);
    navigateToStep(next);
  }, [stepIndex, navigateToStep, completeTutorial, router]);

  const prevStep = useCallback(() => {
    const prev = Math.max(0, stepIndex - 1);
    setStepIndex(prev);
    navigateToStep(prev);
  }, [stepIndex, navigateToStep]);

  useEffect(() => {
    if (!hydrated || completed || isActive) return;
    if (pathname !== "/") return;
    const seen = searchParams.get("tour");
    if (seen === "1") {
      startTutorial(0);
    }
  }, [hydrated, completed, isActive, pathname, searchParams, startTutorial]);

  const value = useMemo(
    (): TutorialContextValue => ({
      isActive,
      stepIndex,
      step,
      totalSteps,
      completed,
      startTutorial,
      skipTutorial,
      nextStep,
      prevStep,
      completeTutorial,
    }),
    [
      isActive,
      stepIndex,
      step,
      totalSteps,
      completed,
      startTutorial,
      skipTutorial,
      nextStep,
      prevStep,
      completeTutorial,
    ]
  );

  return (
    <TutorialContext.Provider value={value}>
      {children}
      {isActive && step && <SiteTutorialOverlay />}
    </TutorialContext.Provider>
  );
}

export function useSiteTutorial(): TutorialContextValue {
  const ctx = useContext(TutorialContext);
  if (!ctx) {
    throw new Error("useSiteTutorial must be used within TutorialProvider");
  }
  return ctx;
}

export function useSiteTutorialOptional(): TutorialContextValue | null {
  return useContext(TutorialContext);
}
