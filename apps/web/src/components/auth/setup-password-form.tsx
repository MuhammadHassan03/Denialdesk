"use client";

import { useActionState, useState } from "react";
import { isPasswordLongEnough, MIN_PASSWORD_LENGTH } from "@/lib/login-rules";
import { type AuthFormState, completeAccountSetup } from "@/server/actions/auth";
import { FormMessage } from "./form-message";
import { SubmitButton } from "./submit-button";
import { TextField } from "./text-field";

const INITIAL_STATE: AuthFormState = { billerMessage: null };

type SetupPasswordFormProps = {
  setupToken: string;
};

function passwordHint(password: string): string {
  if (password.length === 0) {
    return `At least ${MIN_PASSWORD_LENGTH} characters. A short sentence works well.`;
  }
  if (isPasswordLongEnough(password)) {
    return `Long enough (${password.length} characters).`;
  }
  const charactersLeft = MIN_PASSWORD_LENGTH - password.length;
  return `${charactersLeft} more characters needed.`;
}

export function SetupPasswordForm({ setupToken }: SetupPasswordFormProps) {
  const [formState, formAction, isPending] = useActionState(completeAccountSetup, INITIAL_STATE);
  const [password, setPassword] = useState("");
  const [confirmedPassword, setConfirmedPassword] = useState("");

  const isLongEnough = isPasswordLongEnough(password);
  const showMismatch = confirmedPassword.length > 0 && confirmedPassword !== password;
  const canSubmit = isLongEnough && confirmedPassword === password;

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {formState.billerMessage === null ? null : (
        <FormMessage tone="error" message={formState.billerMessage} />
      )}
      <input type="hidden" name="token" value={setupToken} />
      <TextField
        id="password"
        name="password"
        type="password"
        label="New password"
        autoComplete="new-password"
        required
        autoFocus
        minLength={MIN_PASSWORD_LENGTH}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        hint={passwordHint(password)}
      />
      <TextField
        id="confirm-password"
        type="password"
        label="Type it again"
        autoComplete="new-password"
        required
        value={confirmedPassword}
        onChange={(event) => setConfirmedPassword(event.target.value)}
        hasError={showMismatch}
        hint={showMismatch ? "The two passwords don't match." : undefined}
      />
      <SubmitButton
        label="Set password"
        pendingLabel="Saving..."
        isPending={isPending}
        disabled={!canSubmit}
      />
    </form>
  );
}
