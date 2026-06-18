"use client";

import { useEffect, useState } from "react";
import { useSiteTutorialOptional } from "./TutorialProvider";

const DISMISS_KEY = "solanawsop_tutorial_prompt_dismissed";

export default function TutorialWelcomeBanner() {
  const tutorial = useSiteTutorialOptional();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!tutorial || tutorial.completed || tutorial.isActive) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      // ignore
    }
    setVisible(true);
  }, [tutorial]);

  if (!visible || !tutorial) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  };

  const start = () => {
    setVisible(false);
    tutorial.startTutorial(0);
  };

  return (
    <div className="site-tour-welcome mb-5">
      <div className="site-tour-welcome-inner">
        <div>
          <p className="site-tour-welcome-kicker">New here?</p>
          <p className="site-tour-welcome-title">Take the 2-minute site tour</p>
          <p className="site-tour-welcome-copy">
            Cash games, demo, tournaments, private tables, bots — then watch a live hand as a spectator.
          </p>
        </div>
        <div className="site-tour-welcome-actions">
          <button type="button" className="site-tour-btn site-tour-btn--primary" onClick={start}>
            Start tour
          </button>
          <button type="button" className="site-tour-skip" onClick={dismiss}>
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
