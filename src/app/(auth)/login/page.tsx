import { redirect } from "next/navigation";
import { AuthForm } from "@/components/ui/auth-form";
import { auth } from "@/lib/auth";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.id) redirect("/dashboard");
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <AuthForm mode="login" />
    </div>
  );
}
