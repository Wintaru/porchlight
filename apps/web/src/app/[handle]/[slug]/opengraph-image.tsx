import { ImageResponse } from "next/og";

import { createSessionClient } from "@/auth/session-client";
import { parseHandleParam } from "@/lib/handle-param";
import { publicMediaUrl } from "@/lib/media-url";
import { SITE_NAME } from "@/lib/site";
import { loadPostPreview } from "@/read-model/post-page";

export const alt = "Post preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface ImageProps {
  readonly params: Promise<{ readonly handle: string; readonly slug: string }>;
}

// The preview card every post gets when pasted into Discord or another link-unfurling
// client (SPEC.md §9, D18): the cover image with the title and author over it, or —
// a mature cover always, and everything else until it has one — the branded card
// alone. `cover.published_path` stays null for every post today: nothing yet writes it
// (#36 builds that pipeline), so this branch is exercised only by the seeded post that
// carries one directly.
export default async function Image({ params }: ImageProps) {
  const { handle: segment, slug } = await params;
  const handle = parseHandleParam(segment);
  const post =
    handle === undefined
      ? undefined
      : await loadPostPreview(await createSessionClient(), handle, slug);
  const cover = post?.cover;
  const coverUrl =
    cover?.published_path == null || cover.mature
      ? undefined
      : publicMediaUrl(cover.published_path);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: "80px",
        backgroundColor: "#2b2420",
        backgroundImage: coverUrl === undefined ? undefined : `url(${coverUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: "#f6efe6",
        fontFamily: "sans-serif",
      }}
    >
      {coverUrl !== undefined && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background: "linear-gradient(to top, rgba(20,16,12,0.88), rgba(20,16,12,0))",
          }}
        />
      )}
      <div style={{ display: "flex", fontSize: 32, opacity: 0.75 }}>{SITE_NAME}</div>
      <div
        style={{
          display: "flex",
          fontSize: 60,
          fontWeight: 700,
          marginTop: 28,
          lineHeight: 1.15,
        }}
      >
        {post?.title ?? SITE_NAME}
      </div>
      {post?.author != null && (
        <div style={{ display: "flex", fontSize: 30, marginTop: 36, opacity: 0.75 }}>
          @{post.author.handle}
        </div>
      )}
    </div>,
    size,
  );
}
