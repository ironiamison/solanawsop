"use client";

import LobbyAssetImage from "./LobbyAssetImage";

const ASSETS = {
  ace: "/assets/lobby/ace-spades-3d.png",
  king: "/assets/lobby/king-hearts-3d.png",
  chips: "/assets/lobby/chips-floating-3d.png",
} as const;

export default function HeroAssets() {
  return (
    <div className="relative hidden min-h-[220px] w-full overflow-hidden lg:block" aria-hidden>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_65%_45%,rgba(124,58,237,0.18),transparent_60%)]" />

      <div className="lobby-asset-float-slow absolute right-2 top-2 h-[148px] w-[108px]">
        <LobbyAssetImage
          src={ASSETS.ace}
          alt=""
          fill
          className="object-contain object-center drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
          sizes="108px"
          priority
        />
      </div>
      <div className="lobby-asset-float-delay absolute right-[72px] top-10 h-[142px] w-[104px]">
        <LobbyAssetImage
          src={ASSETS.king}
          alt=""
          fill
          className="object-contain object-center drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
          sizes="104px"
          priority
        />
      </div>
      <div className="lobby-asset-float absolute bottom-2 right-0 h-[110px] w-[160px]">
        <LobbyAssetImage
          src={ASSETS.chips}
          alt=""
          fill
          className="object-contain object-bottom drop-shadow-[0_16px_32px_rgba(124,58,237,0.35)]"
          sizes="160px"
          priority
        />
      </div>
    </div>
  );
}

export function JackpotChipStack() {
  return (
    <div
      className="pointer-events-none absolute right-3 top-14 z-0 h-[88px] w-[96px] opacity-90"
      aria-hidden
    >
      <LobbyAssetImage
        src="/assets/lobby/chip-stack-3d.png"
        alt=""
        fill
        className="object-contain object-top drop-shadow-[0_12px_24px_rgba(124,58,237,0.4)]"
        sizes="96px"
      />
    </div>
  );
}

export function TrophyAsset({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <div className={`relative shrink-0 ${className}`}>
      <LobbyAssetImage
        src="/assets/lobby/trophy-3d.png"
        alt=""
        fill
        className="object-contain drop-shadow-[0_8px_16px_rgba(234,179,8,0.25)]"
        sizes="48px"
      />
    </div>
  );
}
