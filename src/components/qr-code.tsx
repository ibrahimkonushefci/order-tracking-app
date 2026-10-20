import { qrSvgPath } from '@/lib/qr';

/** A QR code as inline SVG: always dark on white (phones read inverted codes badly), any theme. */
export function QrCode({
  text,
  label,
  size = 232,
}: {
  text: string;
  label: string;
  size?: number;
}) {
  const { path, size: n } = qrSvgPath(text);
  return (
    <svg
      className="qr"
      viewBox={`0 0 ${n} ${n}`}
      width={size}
      height={size}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      <rect width={n} height={n} fill="#fff" />
      <path d={path} fill="#111" />
    </svg>
  );
}
