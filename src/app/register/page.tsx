import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export default async function RegisterPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-canvas px-6 py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-md flex-col justify-center">
        <div className="fade-up rounded-[12px] border border-line bg-surface p-8 shadow-soft">
          <div className="mb-7">
            <h1 className="font-display text-3xl text-ink">Регистрация</h1>
            <p className="mt-2 text-sm text-muted">
              Роль задает стартовый сценарий, но создавать свои квизы может любой пользователь.
            </p>
          </div>
          <AuthForm mode="register" />
        </div>
      </div>
    </main>
  );
}
