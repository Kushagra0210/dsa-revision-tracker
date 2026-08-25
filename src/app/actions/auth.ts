"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { auth, signIn, signOut } from "@/lib/auth";
import { AUTH_ROUNDS } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { signInSchema, signUpSchema } from "@/lib/validation/schemas";

export async function signUpAction(_prev: unknown, formData: FormData) {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name") ?? undefined,
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { ok: false as const, error: "An account with this email already exists" };
  }

  await prisma.user.create({
    data: {
      name: parsed.data.name ?? null,
      email: parsed.data.email,
      passwordHash: await bcrypt.hash(parsed.data.password, AUTH_ROUNDS),
      revisionSettings: { create: { intervals: [3, 7, 15, 21, 60, 90] } },
    },
  });

  try {
    await signIn("credentials", { email: parsed.data.email, password: parsed.data.password, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false as const, error: "Account created but sign-in failed. Try logging in." };
    }
    throw error;
  }
  return { ok: true as const }; // unreachable: signIn redirects
}

export async function signInAction(_prev: unknown, formData: FormData) {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  try {
    await signIn("credentials", { ...parsed.data, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError && error.type === "CredentialsSignin") {
      return { ok: false as const, error: "Invalid email or password" };
    }
    throw error;
  }
  return { ok: true as const }; // unreachable: signIn redirects
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session;
}
