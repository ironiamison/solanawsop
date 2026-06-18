"use client";

import { useSiteTutorialOptional } from "./TutorialProvider";

export default function TutorialLaunchButton({
  className = "",
  variant = "pill",
  allowReplay = false,
}: {
  className?: string;
  variant?: "pill" | "link";
  allowReplay?: boolean;
}) {
  const tutorial = useSiteTutorialOptional();
  if (!tutorial) return null;
  if (tutorial.completed && !allowReplay) return null;

  const cls =
    variant === "link"
      ? `site-tour-launch site-tour-launch--link ${className}`.trim()
      : `site-tour-launch ${className}`.trim();

  return (
    <button
      type="button"
      className={cls}
      onClick={() => tutorial.startTutorial(0)}
    >
      {tutorial.completed ? "Replay tour" : "Take the tour"}
    </button>
  );
}
