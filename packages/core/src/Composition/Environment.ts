// The shape of `process.env`, passed in rather than read here so a test can hand the
// composition root any environment it likes. Every value is optional and unparsed: the
// composition root is the boundary that validates them (SPEC.md §3, D19).
export type Environment = Readonly<Record<string, string | undefined>>;
