export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-background px-6 py-8">
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <div className="h-10 w-48 animate-pulse rounded-md bg-zinc-200" />
        <div className="h-32 animate-pulse rounded-lg bg-zinc-200" />
        <div className="h-32 animate-pulse rounded-lg bg-zinc-200" />
      </div>
    </main>
  );
}
