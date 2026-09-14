interface AvatarProps {
  readonly src: string | null;
  readonly name: string;
  readonly size: number;
}

// One small circle everywhere a person (or the anonymous raccoon) needs a face: a post
// card's byline, a comment row, a profile header. No image yet (#36 has not wired
// avatar uploads) falls back to the name's first letter, never a broken `<img>`.
export function Avatar({ src, name, size }: AvatarProps) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.42) };
  if (src !== null) {
    // eslint-disable-next-line @next/next/no-img-element -- an external, admin-set URL; next/image would need a configured remote pattern for a self-hosted deployment's own origin.
    return <img className="avatar" style={style} src={src} alt="" />;
  }
  return (
    <span className="avatar" style={style} aria-hidden="true">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
