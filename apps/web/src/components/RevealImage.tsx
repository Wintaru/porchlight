import { classNames } from "@/lib/class-names";
import styles from "./reveal-image.module.css";

interface RevealImageProps {
  readonly id: string;
  readonly src: string;
  readonly alt: string;
  // `mature`: blurred until the reader asks (SPEC.md §7). `review`: a moderator's view
  // of a held image — blurred and grey by default, for their wellbeing.
  readonly mode: "mature" | "review";
  // A held video is reviewed the same way (#90): blurred and grey until the moderator
  // asks, then it plays with its own controls.
  readonly media?: "image" | "video";
  readonly className?: string | undefined;
}

// An image behind a click (#36). The control is a real checkbox with its label, so it
// works with the keyboard and with no JavaScript: checking it lifts the blur in CSS.
export function RevealImage({
  id,
  src,
  alt,
  mode,
  media = "image",
  className,
}: RevealImageProps) {
  const toggleId = `reveal-${id}`;
  return (
    <div
      className={classNames(styles.wrap, className)}
      data-mode={mode}
      data-testid="reveal-image"
    >
      <input id={toggleId} type="checkbox" className={styles.toggle} />
      {media === "video" ? (
        <video
          className={styles.image}
          src={src}
          aria-label={alt}
          controls
          playsInline
          preload="metadata"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- storage origin, not optimised by next/image
        <img className={styles.image} src={src} alt={alt} />
      )}
      <label htmlFor={toggleId} className={styles.label}>
        {mode === "mature"
          ? "Mature content. Show image"
          : media === "video"
            ? "Held video. Show it"
            : "Held image. Show it"}
      </label>
    </div>
  );
}
