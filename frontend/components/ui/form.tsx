"use client";

import { ReactNode } from "react";
import { Controller, ControllerProps, FieldPath, FieldValues, FormProvider, useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";

export { FormProvider as Form };

export function FormField<T extends FieldValues, N extends FieldPath<T>>(props: ControllerProps<T, N>) {
  return <Controller {...props} />;
}

export function FormItem({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("space-y-2", className)}>{children}</div>;
}

export function FormLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">{children}</label>;
}

export function FormMessage({ name }: { name: string }) {
  const { formState } = useFormContext();
  const error = name.split(".").reduce<unknown>((value, key) => {
    if (typeof value !== "object" || value === null) return undefined;
    return (value as Record<string, unknown>)[key];
  }, formState.errors);
  const message = typeof error === "object" && error !== null && "message" in error ? (error as { message?: unknown }).message : undefined;
  return message ? <p className="text-sm text-destructive" role="alert">{String(message)}</p> : null;
}
