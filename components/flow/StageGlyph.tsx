import type { StageId } from "@/content/stages";

/** Small line-art icon for each stage. Inherits color from `currentColor`. */
export function StageGlyph({ id, className }: { id: StageId; className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {GLYPHS[id]}
    </svg>
  );
}

const GLYPHS: Record<StageId, React.ReactNode> = {
  rtl: (
    <>
      <path d="M14 12 L7 20 L14 28" />
      <path d="M26 12 L33 20 L26 28" />
      <path d="M22.5 10 L17.5 30" />
    </>
  ),
  synthesis: (
    <>
      <path d="M11 11 H19 A9 9 0 0 1 19 29 H11 Z" />
      <path d="M4 15.5 H11 M4 24.5 H11 M28 20 H36" />
      <circle cx="36" cy="20" r="0.8" fill="currentColor" />
    </>
  ),
  floorplanning: (
    <>
      <rect x="5" y="5" width="30" height="30" rx="1.5" />
      <rect x="9.5" y="9.5" width="21" height="21" strokeDasharray="2 2" opacity={0.6} />
      <rect x="11.5" y="11.5" width="8" height="7" fill="currentColor" fillOpacity={0.25} />
      <rect x="21.5" y="21.5" width="7" height="7" fill="currentColor" fillOpacity={0.25} />
      <path d="M5 14 H2.5 M5 20 H2.5 M5 26 H2.5 M35 14 H37.5 M35 20 H37.5 M35 26 H37.5" />
    </>
  ),
  placement: (
    <>
      <path d="M5 9 H35 M5 18 H35 M5 27 H35 M5 36 H35" opacity={0.35} />
      <rect x="6" y="10.5" width="6" height="6" fill="currentColor" fillOpacity={0.3} />
      <rect x="13.5" y="10.5" width="9" height="6" fill="currentColor" fillOpacity={0.3} />
      <rect x="24" y="10.5" width="5" height="6" fill="currentColor" fillOpacity={0.3} />
      <rect x="9" y="19.5" width="10" height="6" fill="currentColor" fillOpacity={0.3} />
      <rect x="20.5" y="19.5" width="6" height="6" fill="currentColor" fillOpacity={0.3} />
      <rect x="28" y="19.5" width="6" height="6" fill="currentColor" fillOpacity={0.3} />
      <rect x="6" y="28.5" width="7" height="6" fill="currentColor" fillOpacity={0.3} />
      <rect x="17" y="28.5" width="11" height="6" fill="currentColor" fillOpacity={0.3} />
    </>
  ),
  cts: (
    <>
      <path d="M20 5 V13 M10 13 H30 M10 13 V22 M30 13 V22 M5 22 H15 M25 22 H35 M5 22 V30 M15 22 V30 M25 22 V30 M35 22 V30" />
      {[5, 15, 25, 35].map((x) => (
        <rect key={x} x={x - 2} y={30} width={4} height={4} fill="currentColor" fillOpacity={0.4} />
      ))}
    </>
  ),
  routing: (
    <>
      <path d="M5 12 H22 V29 H35" />
      <path d="M5 27 H13 V8 H35" opacity={0.55} />
      <rect x="20.5" y="10.5" width="3" height="3" fill="currentColor" />
      <rect x="11.5" y="25.5" width="3" height="3" fill="currentColor" />
      <rect x="20.5" y="27.5" width="3" height="3" fill="currentColor" />
    </>
  ),
  signoff: (
    <>
      <path d="M20 5 L32 9.5 V19 C32 26.5 27 31.5 20 35 C13 31.5 8 26.5 8 19 V9.5 Z" />
      <path d="M14.5 20 L18.5 24 L26 16.5" />
    </>
  ),
};
