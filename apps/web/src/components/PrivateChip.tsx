// The mark on a private post (D27, #101): a lock and "Only you", in the warm chip the
// Post board gives its "author" and "anonymous" badges. Only the author ever sees a
// private post, so only the author ever sees this.
export function PrivateChip() {
  return (
    <span
      className="chip chip--warm"
      data-testid="private-chip"
      title="Private: only you can see this post"
    >
      <svg aria-hidden="true" width="11" height="11" viewBox="0 0 16 16" fill="none">
        <rect x="3" y="7" width="10" height="8" rx="1.5" fill="currentColor" />
        <path
          d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      Only you
    </span>
  );
}
