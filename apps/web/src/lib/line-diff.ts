// A line diff for the post history page (#23): the longest common subsequence of lines,
// then a walk that marks each line kept, added or removed. Posts are at most a few
// thousand lines, so the full table fits; past MAX_CELLS the diff is simply "all of the
// old removed, all of the new added", which is still correct, only less precise.
export type DiffLine =
  | { readonly kind: "same"; readonly text: string }
  | { readonly kind: "added"; readonly text: string }
  | { readonly kind: "removed"; readonly text: string };

const MAX_CELLS = 4_000_000;

export function lineDiff(before: string, after: string): readonly DiffLine[] {
  const a = before.split("\n");
  const b = after.split("\n");
  if (a.length * b.length > MAX_CELLS) {
    return [
      ...a.map((text): DiffLine => ({ kind: "removed", text })),
      ...b.map((text): DiffLine => ({ kind: "added", text })),
    ];
  }
  // cell(i, j): the longest common subsequence of a[i..] and b[j..], in one flat table.
  const width = b.length + 1;
  const table = new Uint32Array((a.length + 1) * width);
  const cell = (i: number, j: number): number => table[i * width + j] ?? 0;
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i * width + j] =
        a[i] === b[j] ? cell(i + 1, j + 1) + 1 : Math.max(cell(i + 1, j), cell(i, j + 1));
    }
  }
  const lines: DiffLine[] = [];
  let i = 0;
  let j = 0;
  for (;;) {
    const left = a[i];
    const right = b[j];
    if (left === undefined || right === undefined) {
      break;
    }
    if (left === right) {
      lines.push({ kind: "same", text: left });
      i += 1;
      j += 1;
    } else if (cell(i + 1, j) >= cell(i, j + 1)) {
      lines.push({ kind: "removed", text: left });
      i += 1;
    } else {
      lines.push({ kind: "added", text: right });
      j += 1;
    }
  }
  lines.push(...a.slice(i).map((text): DiffLine => ({ kind: "removed", text })));
  lines.push(...b.slice(j).map((text): DiffLine => ({ kind: "added", text })));
  return lines;
}

// The diff with long runs of unchanged lines folded: `context` lines stay on each side
// of a change, and each fold becomes one `{ kind: "fold", count }` marker.
export type ShownLine = DiffLine | { readonly kind: "fold"; readonly count: number };

export function foldUnchanged(
  lines: readonly DiffLine[],
  context = 2,
): readonly ShownLine[] {
  const near = lines.map((line, index) =>
    lines
      .slice(Math.max(0, index - context), index + context + 1)
      .some((other) => other.kind !== "same"),
  );
  const shown: ShownLine[] = [];
  let folded = 0;
  for (const [index, line] of lines.entries()) {
    if (line.kind === "same" && !near[index]) {
      folded += 1;
      continue;
    }
    if (folded > 0) {
      shown.push({ kind: "fold", count: folded });
      folded = 0;
    }
    shown.push(line);
  }
  if (folded > 0) {
    shown.push({ kind: "fold", count: folded });
  }
  return shown;
}
