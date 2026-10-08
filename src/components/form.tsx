"use client";

import { useFormStatus } from "react-dom";

export function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      <input
        className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-base font-normal outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-100"
        {...props}
      />
    </label>
  );
}

export function SubmitButton({ children }: { children: React.ReactNode }) {
  // Form gönderilirken butonu kilitler; çift tıklama iki istek göndermez.
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-neutral-900 px-4 py-2 font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
    >
      {pending ? "Bekle..." : children}
    </button>
  );
}

export function FormMessage({
  state,
}: {
  state: { error?: string; message?: string } | undefined;
}) {
  if (state?.error) {
    return (
      <p
        role="alert"
        className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
      >
        {state.error}
      </p>
    );
  }
  if (state?.message) {
    return (
      <p
        role="status"
        className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950 dark:text-green-300"
      >
        {state.message}
      </p>
    );
  }
  return null;
}

export function Select({
  label,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      <select
        className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-base font-normal dark:border-neutral-700 dark:bg-neutral-900"
        {...props}
      >
        {children}
      </select>
    </label>
  );
}
