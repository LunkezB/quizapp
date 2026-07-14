import { SocketStatus } from "@/components/socket-status";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-10 px-6 py-12">
        <div className="max-w-3xl space-y-5">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
            Real-time quiz MVP foundation
          </p>
          <h1 className="text-4xl font-semibold leading-tight text-zinc-950 sm:text-5xl">
            QuizApp: Next.js, Socket.IO, PostgreSQL and Prisma are wired.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-zinc-600">
            This screen is intentionally minimal. Product auth, quiz CRUD and game mechanics are
            left for the next iteration; the live socket health check below validates the shared
            server process.
          </p>
        </div>

        <SocketStatus />
      </section>
    </main>
  );
}
