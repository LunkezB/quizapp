export default function HostHistoryDetailLoading() {
  return (
    <main className="min-h-screen bg-canvas px-6 py-12">
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <div className="h-10 w-64 animate-pulse rounded-[8px] bg-black/5" />
        <div className="h-40 animate-pulse rounded-[12px] bg-black/5" />
        <div className="h-32 animate-pulse rounded-[12px] bg-black/5" />
        <div className="h-32 animate-pulse rounded-[12px] bg-black/5" />
      </div>
    </main>
  );
}
