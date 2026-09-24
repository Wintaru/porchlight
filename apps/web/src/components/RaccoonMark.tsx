interface RaccoonMarkProps {
  readonly size: number;
}

// The anonymous author's face (SPEC.md §12: the raccoon as inline SVG), drawn from the
// Post board, in the same circle an Avatar sits in.
export function RaccoonMark({ size }: RaccoonMarkProps) {
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: "var(--line)" }}
      aria-hidden="true"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 20l4-8 6 5h4l6-5 4 8" fill="#B9AE9F" />
        <path d="M12 20c0 9 5 15 12 15s12-6 12-15" fill="#D9CFC2" />
        <path d="M14 22c2-3 5-4 8-2 1 1 1 3 0 4-3 2-6 1-8-2Z" fill="#2A2622" />
        <path d="M34 22c-2-3-5-4-8-2-1 1-1 3 0 4 3 2 6 1 8-2Z" fill="#2A2622" />
        <circle cx="19" cy="23" r="1.4" fill="#FFFCF7" stroke="none" />
        <circle cx="29" cy="23" r="1.4" fill="#FFFCF7" stroke="none" />
      </svg>
    </span>
  );
}
