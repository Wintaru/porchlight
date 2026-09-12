import { connect, UNREACHABLE_MESSAGE } from "./local-stack.js";

// Fails the whole run with one clear message when the stack is down, instead of a
// connection error inside every test file.
export default async function globalSetup(): Promise<void> {
  const sql = connect();
  try {
    await sql`select 1`;
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`${UNREACHABLE_MESSAGE}\n${detail}`);
  } finally {
    await sql.end();
  }
}
