// A client address as a proxy reported it, split for the `inet` and port columns
// (SPEC.md §7). Some proxies append a port (`203.0.113.9:51234`, `[2001:db8::1]:443`);
// a misconfigured one can send any text. Anything that is not an IPv4 or IPv6 address
// comes back as `ip: null`, so the row is still written without a raw address rather
// than refused by Postgres.
export interface ClientAddress {
  readonly ip: string | null;
  readonly port: number | null;
}

const IPV4 =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const IPV4_WITH_PORT = /^([\d.]+):(\d{1,5})$/;
const BRACKETED_IPV6 = /^\[([0-9a-fA-F:.]+)\](?::(\d{1,5}))?$/;
const MAX_PORT = 65535;

export function parseClientAddress(raw: string): ClientAddress {
  const text = raw.trim();
  if (IPV4.test(text)) {
    return { ip: text, port: null };
  }
  const v4 = IPV4_WITH_PORT.exec(text);
  if (v4?.[1] !== undefined && IPV4.test(v4[1])) {
    return { ip: v4[1], port: portOf(v4[2]) };
  }
  const bracketed = BRACKETED_IPV6.exec(text);
  if (bracketed?.[1] !== undefined) {
    return isIpv6(bracketed[1])
      ? { ip: bracketed[1], port: portOf(bracketed[2]) }
      : { ip: null, port: null };
  }
  return isIpv6(text) ? { ip: text, port: null } : { ip: null, port: null };
}

// The URL parser is the runtime-neutral IPv6 check: it throws on a malformed literal.
function isIpv6(text: string): boolean {
  if (!text.includes(":") || !/^[0-9a-fA-F:.]+$/.test(text)) {
    return false;
  }
  try {
    new URL(`http://[${text}]/`);
    return true;
  } catch {
    return false;
  }
}

function portOf(text: string | undefined): number | null {
  if (text === undefined) {
    return null;
  }
  const port = Number.parseInt(text, 10);
  return port > 0 && port <= MAX_PORT ? port : null;
}
