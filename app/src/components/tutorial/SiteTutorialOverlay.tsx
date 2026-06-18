"use client";

import { useCallback, useEffect, useState } from "react";
import { useSiteTutorial } from "./TutorialProvider";

type Rect = { top: number; left: number; width: number; height: number };

export default function SiteTutorialOverlay() {
  const { step, stepIndex, totalSteps, nextStep, prevStep, skipTutorial } =
    useSiteTutorial();
  const [spot, setSpot] = useState<Rect | null>(null);

  const measure = useCallback(() => {
    if (!step?.highlight) {
      setSpot(null);
      return;
    }
    const el = document.querySelector(step.highlight);
    if (!el) {
      setSpot(null);
      return;
    }
    const r = el.getBoundingClientRect();
    const pad = 8;
    setSpot({
      top: Math.max(8, r.top - pad),
      left: Math.max(8, r.left - pad),
      width: r.width + pad * 2,
      height: r.height + pad * 2,
    });
  }, [step?.highlight]);

  useEffect(() => {
    measure();
    const t1 = window.setTimeout(measure, 120);
    const t2 = window.setTimeout(measure, 450);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure, step?.id, stepIndex]);

  if (!step) return null;

  const isFirst = stepIndex === 0;
  const isLast = step.finale === true;

  return (
    <div className="site-tour-root" role="dialog" aria-modal aria-labelledby="site-tour-title">
      {!spot ? (
        <div className="site-tour-backdrop site-tour-backdrop--full" aria-hidden />
      ) : (
        <div
          className="site-tour-spotlight"
          style={{
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
          }}
          aria-hidden
        />
      )}

      <div className={`site-tour-card${spot ? " site-tour-card--anchored" : ""}`}>
        <p className="site-tour-kicker">
          Site tour · {stepIndex + 1} / {totalSteps}
        </p>
        <h2 id="site-tour-title" className="site-tour-title">
          {step.title}
        </h2>
        <p className="site-tour-body">{step.body}</p>

        <div className="site-tour-progress" aria-hidden>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <span
              key={i}
              className={`site-tour-dot${i === stepIndex ? " site-tour-dot--active" : i < stepIndex ? " site-tour-dot--done" : ""}`}
            />
          ))}
        </div>

        <div className="site-tour-actions">
          <button type="button" className="site-tour-skip" onClick={skipTutorial}>
            Skip tour
          </button>
          <div className="site-tour-nav">
            {!isFirst && (
              <button type="button" className="site-tour-btn site-tour-btn--ghost" onClick={prevStep}>
                Back
              </button>
            )}
            <button
              type="button"
              className="site-tour-btn site-tour-btn--primary"
              onClick={nextStep}
            >
              {isLast ? "Enter demo as spectator" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
