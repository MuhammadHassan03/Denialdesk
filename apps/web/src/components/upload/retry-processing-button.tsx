"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { retryRemittanceProcessing } from "@/server/actions/uploads";

type RetryProcessingButtonProps = {
  remittanceId: string;
};

export function RetryProcessingButton({ remittanceId }: RetryProcessingButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [billerMessage, setBillerMessage] = useState<string | null>(null);

  function retry() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("remittanceId", remittanceId);
      const result = await retryRemittanceProcessing(formData);
      if (result.outcome === "rejected") {
        setBillerMessage(result.billerMessage);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={retry}
        disabled={isPending}
        className="inline-flex min-h-10 items-center rounded-[10px] border border-line-strong px-3.5 text-sm font-semibold text-subtle hover:border-brand hover:text-brand disabled:opacity-60"
      >
        {isPending ? "Queuing..." : "Try again"}
      </button>
      {billerMessage === null ? null : (
        <span role="alert" className="text-xs text-bad-dark">
          {billerMessage}
        </span>
      )}
    </div>
  );
}
