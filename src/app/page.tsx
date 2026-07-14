import Link from "next/link";
import { SocketStatus } from "@/components/socket-status";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-10 px-6 py-12">
        <div className="max-w-3xl space-y-5">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">QuizApp</p>
          <h1 className="text-4xl font-semibold leading-tight text-zinc-950 sm:text-5xl">
            Квиз в реальном времени для любой компании
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-zinc-600">
            Организатор создаёт квиз и запускает игру, участники подключаются с телефона по
            коду — и отвечают на вопросы синхронно, в реальном времени.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href={user ? "/dashboard" : "/login"}
              className="inline-flex h-11 items-center rounded-md bg-emerald-700 px-6 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              {user ? "Мой кабинет" : "Войти"}
            </Link>
            <Link
              href="/join"
              className="inline-flex h-11 items-center rounded-md border border-zinc-300 bg-white px-6 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
            >
              Подключиться по коду
            </Link>
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Статус соединения
          </h2>
          <SocketStatus />
        </div>
      </section>
    </main>
  );
}
