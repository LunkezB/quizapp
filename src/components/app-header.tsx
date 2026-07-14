import Link from "next/link";
import { logoutAction } from "@/actions/auth";
import type { CurrentUser } from "@/lib/auth";

type AppHeaderProps = {
  user: CurrentUser;
};

export function AppHeader({ user }: AppHeaderProps) {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/dashboard" prefetch={false} className="text-lg font-semibold text-zinc-950">
            QuizApp
          </Link>
          <p className="text-sm text-zinc-600">
            {user.displayName} · {user.email}
          </p>
        </div>

        <nav className="flex flex-wrap items-center gap-4 text-sm font-medium text-zinc-700">
          <Link href="/join" prefetch={false} className="hover:text-emerald-800">
            Подключиться
          </Link>
          <Link href="/history" prefetch={false} className="hover:text-emerald-800">
            Мои игры
          </Link>
          <Link href="/host-history" prefetch={false} className="hover:text-emerald-800">
            Проведённые игры
          </Link>
        </nav>

        <form action={logoutAction}>
          <button
            type="submit"
            className="h-10 rounded-md border border-zinc-300 px-4 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
          >
            Выйти
          </button>
        </form>
      </div>
    </header>
  );
}
