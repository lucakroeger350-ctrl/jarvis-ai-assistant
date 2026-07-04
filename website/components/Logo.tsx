export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(32,32)">
        <g stroke="#ff7a33" strokeWidth="2.4" fill="none" opacity="0.9">
          <ellipse rx="22" ry="9" />
          <ellipse rx="22" ry="9" transform="rotate(60)" />
          <ellipse rx="22" ry="9" transform="rotate(120)" />
        </g>
        <polygon points="0,-10 8.5,-5 8.5,5 0,10 -8.5,5 -8.5,-5" fill="#ff5722" stroke="#ffb37a" strokeWidth="0.6" />
        <polygon points="0,-5 4.3,-2.5 4.3,2.5 0,5 -4.3,2.5 -4.3,-2.5" fill="#ffcf8a" />
      </g>
    </svg>
  );
}
