import Link from "next/link";
import { logoutAction } from "@/actions/auth";
import { buttonClassName } from "@/components/ui/button";
import type { CurrentUser } from "@/lib/auth";

type AppHeaderProps = {
  user: CurrentUser;
};

export function AppHeader({ user }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/85 backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/dashboard" prefetch={false} className="font-display text-lg text-ink">
            QuizApp
          </Link>
          <p className="text-sm text-muted">
            {user.displayName} · {user.email}
          </p>
        </div>

        <nav className="flex flex-wrap items-center gap-5 text-sm font-medium text-muted">
          <Link href="/join" prefetch={false} className="transition-colors hover:text-ink">
            Подключиться
          </Link>
          <Link href="/history" prefetch={false} className="transition-colors hover:text-ink">
            Мои игры
          </Link>
          <Link href="/host-history" prefetch={false} className="transition-colors hover:text-ink">
            Проведённые игры
          </Link>
        </nav>

        <form action={logoutAction}>
          <button type="submit" className={buttonClassName("secondary", "sm")}>
            Выйти
          </button>
        </form>
      </div>
    </header>
  );
}
