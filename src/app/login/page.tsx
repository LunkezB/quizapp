import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const nextParam = Array.isArray(params.next) ? params.next[0] : params.next;
  const nextPath = nextParam?.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-md flex-col justify-center">
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-zinc-950">Вход</h1>
            <p className="mt-2 text-sm text-zinc-600">Доступ к кабинету и редактору квизов.</p>
          </div>
          <AuthForm mode="login" nextPath={nextPath} />
        </div>
      </div>
    </main>
  );
}
