export default function Loading() {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-6 w-40 animate-pulse rounded bg-muted" />
      <div className="h-24 animate-pulse rounded-md bg-muted" />
      <div className="h-16 animate-pulse rounded-md bg-muted" />
    </div>
  );
}
