"use client";

import { unstable_rethrow } from "next/navigation";
import { type ReactNode, type SubmitEvent, useState, useTransition } from "react";

// What a server function answers when it refuses a submit: an error code the form turns
// into a sentence. A submit it accepts redirects instead, so it never returns.
export interface SubmitRefused {
  readonly error: string;
  // The server's own words on what was wrong, when it has them.
  readonly detail?: string;
}

// A sentence per error code; `unavailable` is the one for anything unknown.
export type FormMessages = Readonly<Record<string, string>> & {
  readonly unavailable: string;
};

interface KeepTypedFormProps {
  // The form's own action, for a browser without JS: it redirects back with ?error=.
  readonly action: (formData: FormData) => Promise<void>;
  // The same save with JS. A refusal comes back here, so the page keeps what was typed:
  // a redirect to the same page with new search params remounts it and clears the
  // fields (#107, #108).
  readonly submitInPlace: (formData: FormData) => Promise<SubmitRefused>;
  readonly messages: FormMessages;
  readonly className?: string | undefined;
  readonly children: ReactNode;
}

export function KeepTypedForm({
  action,
  submitInPlace,
  messages,
  className,
  children,
}: KeepTypedFormProps) {
  const [refused, setRefused] = useState<SubmitRefused | undefined>(undefined);
  const [pending, startSubmit] = useTransition();

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRefused(undefined);
    const formData = new FormData(event.currentTarget, event.submitter);
    startSubmit(async () => {
      try {
        setRefused(await submitInPlace(formData));
      } catch (thrown: unknown) {
        // An accepted save's redirect passes through; a dropped connection keeps the
        // page as typed, like a refusal.
        unstable_rethrow(thrown);
        console.error("form submit failed", thrown);
        setRefused({ error: "unavailable" });
      }
    });
  };

  return (
    <>
      {refused !== undefined && (
        <p role="alert" className="form-alert" data-testid="form-error">
          {refusalText(refused, messages)}
        </p>
      )}
      <form action={action} onSubmit={submit} className={className} aria-busy={pending}>
        {children}
      </form>
    </>
  );
}

function refusalText(refused: SubmitRefused, messages: FormMessages): string {
  const text = messages[refused.error] ?? messages.unavailable;
  return refused.detail === undefined
    ? text
    : `${text.replace(/\.$/, "")}: ${refused.detail}.`;
}
