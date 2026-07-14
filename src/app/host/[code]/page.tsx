import { notFound } from "next/navigation";
import { HostGameClient } from "@/components/host-game-client";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

type HostPageProps = {
  params: Promise<{ code: string }>;
};

export default async function HostPage({ params }: HostPageProps) {
  const user = await requireCurrentUser();
  const { code } = await params;

  const session = await prisma.session.findFirst({
    where: { code: code.toUpperCase(), hostId: user.id },
    select: { code: true, quiz: { select: { title: true } } },
  });

  if (!session) {
    notFound();
  }

  return <HostGameClient code={session.code} quizTitle={session.quiz.title} />;
}
