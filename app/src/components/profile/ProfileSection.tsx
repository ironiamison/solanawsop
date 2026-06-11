import type { ReactNode } from "react";

export default function ProfileSection({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`profile-section ${className}`}>
      {(title || action) && (
        <header className="profile-section-header">
          <div>
            {title && <h2 className="profile-section-title">{title}</h2>}
            {subtitle && <p className="profile-section-sub">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
