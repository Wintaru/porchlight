// What `sharp` resolves to in a browser bundle (next.config.ts). Client components
// import small constants from @porchlight/core, and the core's entry also reaches the
// media publish step (#36), a native Node module. The browser never calls it; if
// anything ever does, it fails loudly here rather than as a missing `fs`.
export default function sharp(): never {
  throw new Error("sharp runs on the server only");
}
