"use client";

import { useEffect, useRef } from "react";

import { drawDiagrams } from "./draw-diagrams";

interface ProseHtmlProps {
  // The ContentRenderEngine's sanitized output, so it is safe to set as HTML.
  readonly html: string;
  readonly className: string;
  readonly testId: string;
}

// A rendered body, with its mermaid blocks drawn as diagrams once the page runs.
export function ProseHtml({ html, className, testId }: ProseHtmlProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (root === null) {
      return;
    }
    let isCancelled = false;
    drawDiagrams(root, () => isCancelled).catch((error: unknown) => {
      console.warn("The diagram library did not load; diagrams show as code.", error);
    });
    return () => {
      isCancelled = true;
    };
  }, [html]);
  return (
    <div
      ref={ref}
      className={className}
      data-testid={testId}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
