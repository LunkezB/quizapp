import { AppHeader } from "@/components/app-header";
import { JoinForm } from "@/components/join-form";
import { requireCurrentUser } from "@/lib/auth";

export default async function JoinPage() {
  const user = await requireCurrentUser();

  return (
    <main className="min-h-screen bg-canvas">
      <AppHeader user={user} />
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-md flex-col justify-center px-6 py-12">
        <div className="fade-up rounded-[12px] border border-line bg-surface p-8 shadow-soft">
          <div className="mb-7">
            <h1 className="font-display text-3xl text-ink">Подключиться к игре</h1>
            <p className="mt-2 text-sm text-muted">Введите код комнаты и никнейм для этой игры.</p>
          </div>
          <JoinForm defaultNickname={user.displayName} />
        </div>
      </div>
    </main>
  );
}
