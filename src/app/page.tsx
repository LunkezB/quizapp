import Link from "next/link";
import { SocketStatus } from "@/components/socket-status";
import { buttonClassName } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <main className="relative min-h-screen overflow-hidden bg-canvas text-ink">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute left-1/2 top-32 h-[520px] w-[520px] -translate-x-1/2 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(120,119,116,0.05), transparent 70%)" }}
        />
      </div>

      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-16 px-6 py-24">
        <Reveal className="max-w-3xl space-y-6">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">QuizApp</p>
          <h1 className="font-display text-5xl text-ink sm:text-6xl">
            Квиз в реальном времени для любой компании
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-muted">
            Организатор создаёт квиз и запускает игру, участники подключаются с телефона по коду — и отвечают
            на вопросы синхронно, в реальном времени.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link href={user ? "/dashboard" : "/login"} className={buttonClassName("primary", "lg", "px-6")}>
              {user ? "Мой кабинет" : "Войти"}
            </Link>
            <Link href="/join" className={buttonClassName("secondary", "lg", "px-6")}>
              Подключиться по коду
            </Link>
          </div>
        </Reveal>

        <Reveal delayMs={120}>
          <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-faint">Статус соединения</h2>
          <SocketStatus />
        </Reveal>
      </section>
    </main>
  );
}
