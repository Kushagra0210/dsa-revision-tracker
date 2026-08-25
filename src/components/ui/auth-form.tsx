"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInAction, signUpAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [state, formAction, pending] = useActionState(
    mode === "login" ? signInAction : signUpAction,
    null,
  );

  return (
    <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-xs">
      <h1 className="mb-1 text-lg font-bold">
        {mode === "login" ? "Welcome back" : "Create your account"}
      </h1>
      <p className="mb-5 text-sm text-muted-foreground">
        {mode === "login"
          ? "Sign in to see today's revisions."
          : "Start building your spaced-repetition habit."}
      </p>
      <form action={formAction} className="flex flex-col gap-3">
        {mode === "register" && (
          <div className="flex flex-col gap-1">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="Kushagra" autoComplete="name" />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </div>
        {state?.ok === false && <p className="text-xs text-danger">{state.error}</p>}
        <Button type="submit" disabled={pending}>
          {pending ? "Please wait…" : mode === "login" ? "Sign in" : "Sign up"}
        </Button>
      </form>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        {mode === "login" ? (
          <>
            No account?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Sign up
            </Link>
          </>
        ) : (
          <>
            Already registered?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
