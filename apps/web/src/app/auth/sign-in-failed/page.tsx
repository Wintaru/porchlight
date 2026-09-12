import Link from "next/link";

export default function SignInFailedPage() {
  return (
    <main>
      <h1>Sign-in did not complete</h1>
      <p>
        Something went wrong between Google and Porchlight. Nothing was saved. Try again
        from the <Link href="/">home page</Link>.
      </p>
    </main>
  );
}
