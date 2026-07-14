import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export default async function RegisterPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-md flex-col justify-center">
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-zinc-950">Регистрация</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Роль задает стартовый сценарий, но создавать свои квизы может любой пользователь.
            </p>
          </div>
          <AuthForm mode="register" />
        </div>
      </div>
    </main>
  );
}
