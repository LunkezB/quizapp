import { AppHeader } from "@/components/app-header";
import { JoinForm } from "@/components/join-form";
import { requireCurrentUser } from "@/lib/auth";

export default async function JoinPage() {
  const user = await requireCurrentUser();

  return (
    <main className="min-h-screen bg-background">
      <AppHeader user={user} />
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-md flex-col justify-center px-6 py-12">
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-zinc-950">Подключиться к игре</h1>
            <p className="mt-2 text-sm text-zinc-600">Введите код комнаты и никнейм для этой игры.</p>
          </div>
          <JoinForm defaultNickname={user.displayName} />
        </div>
      </div>
    </main>
  );
}
