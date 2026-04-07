"use client";

import { useFormStatus } from "react-dom";

type FormSubmitButtonProps = {
  idleLabel: string;
  pendingLabel: string;
};

export function FormSubmitButton({ idleLabel, pendingLabel }: FormSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <div className="grid gap-2">
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="inline-flex items-center justify-center gap-3 rounded-[1.1rem] bg-brand px-4 py-4 font-semibold text-white transition duration-200 hover:bg-brand-strong active:scale-[0.99] disabled:cursor-wait disabled:bg-brand-strong/85 disabled:text-white/90"
      >
        {pending ? (
          <>
            <span className="inline-flex size-5 items-center justify-center">
              <span className="size-4 animate-spin rounded-full border-2 border-white/25 border-t-white" />
            </span>
            {pendingLabel}
          </>
        ) : (
          idleLabel
        )}
      </button>

      <div
        aria-live="polite"
        className={`overflow-hidden text-center text-sm transition-all duration-200 ${
          pending ? "max-h-10 opacity-100 text-muted" : "max-h-0 opacity-0"
        }`}
      >
        <span className="inline-flex items-center gap-2 rounded-full bg-black/4 px-3 py-1.5">
          <span className="size-2 animate-pulse rounded-full bg-highlight" />
          Salvando cadastro...
        </span>
      </div>
    </div>
  );
}
