"use client";

export default function TableControls({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center justify-center gap-2.5 py-2">{children}</div>;
}

export function TableControlBtn({
  children,
  onClick,
  disabled,
  variant = "primary",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost" | "danger";
}) {
  const cls =
    variant === "danger"
      ? "opoker-control-btn opoker-control-btn-ghost"
      : variant === "ghost"
        ? "opoker-control-btn opoker-control-btn-ghost"
        : "opoker-control-btn opoker-control-btn-primary";

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}
