"use client";

import { useActionState } from "react";
import { type AuthFormState, signIn } from "@/server/actions/auth";
import { FormMessage } from "./form-message";
import { SubmitButton } from "./submit-button";
import { TextField } from "./text-field";

const INITIAL_STATE: AuthFormState = { billerMessage: null };

type LoginFormProps = {
  nextPath: string | null;
};

export function LoginForm({ nextPath }: LoginFormProps) {
  const [formState, formAction, isPending] = useActionState(signIn, INITIAL_STATE);
  const hasError = formState.billerMessage !== null;

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {hasError ? <FormMessage tone="error" message={formState.billerMessage ?? ""} /> : null}
      {nextPath === null ? null : <input type="hidden" name="next" value={nextPath} />}
      <TextField
        id="email"
        name="email"
        type="email"
        label="Email"
        autoComplete="username"
        defaultValue={formState.email}
        // A new key after each failed try makes React show the email the server sent back.
        key={formState.email ?? "empty"}
        required
        autoFocus
        hasError={hasError}
      />
      <TextField
        id="password"
        name="password"
        type="password"
        label="Password"
        autoComplete="current-password"
        required
        hasError={hasError}
      />
      <SubmitButton label="Sign in" pendingLabel="Signing in..." isPending={isPending} />
    </form>
  );
}
