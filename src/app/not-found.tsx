import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-canvas px-6 py-12">
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-start justify-center">
        <h1 className="font-display text-4xl text-ink">Страница не найдена</h1>
        <p className="mt-3 text-sm text-muted">Ресурс не существует или недоступен текущему пользователю.</p>
        <Link href="/dashboard" className={buttonClassName("primary", "md", "mt-6")}>
          В кабинет
        </Link>
      </div>
    </main>
  );
}
