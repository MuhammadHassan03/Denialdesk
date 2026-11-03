type FormMessageTone = "error" | "notice";

const TONE_CLASSES: Record<FormMessageTone, string> = {
  error: "bg-bad-soft text-bad-dark",
  notice: "bg-brand-soft text-brand-dark",
};

type FormMessageProps = {
  tone: FormMessageTone;
  message: string;
};

// Errors are announced right away; notices wait for the screen reader to finish.
export function FormMessage({ tone, message }: FormMessageProps) {
  const role = tone === "error" ? "alert" : "status";
  return (
    <p role={role} className={`m-0 rounded-xl px-3.5 py-3 text-sm ${TONE_CLASSES[tone]}`}>
      {message}
    </p>
  );
}
