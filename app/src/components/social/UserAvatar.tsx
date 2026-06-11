export default function UserAvatar({
  image,
  name,
  size = "md",
  online,
}: {
  image?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg";
  online?: boolean;
}) {
  const dim = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-10 w-10";
  const initial = (name ?? "?").charAt(0).toUpperCase();

  return (
    <div className="relative shrink-0">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          className={`${dim} rounded-full object-cover ring-2 ring-violet-500/25`}
        />
      ) : (
        <div
          className={`${dim} flex items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-violet-900 text-sm font-bold text-white ring-2 ring-violet-500/20`}
        >
          {initial}
        </div>
      )}
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0c0c10] ${
            online ? "bg-emerald-400" : "bg-zinc-600"
          }`}
        />
      )}
    </div>
  );
}
