export default function ProfilePageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <header className="profile-page-header">
      <p className="profile-page-eyebrow">Social</p>
      <h1 className="profile-page-title">{title}</h1>
      <p className="profile-page-sub">{subtitle}</p>
    </header>
  );
}
