import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
      <h2 className="text-lg font-semibold">Not found</h2>
      <p className="text-sm text-muted-foreground">This page or problem does not exist.</p>
      <Link href="/dashboard" className="text-sm text-primary hover:underline">
        Back to dashboard
      </Link>
    </div>
  );
}
