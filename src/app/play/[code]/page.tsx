import { PlayGameClient } from "@/components/play-game-client";
import { requireCurrentUser } from "@/lib/auth";

type PlayPageProps = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ nickname?: string | string[] }>;
};

export default async function PlayPage({ params, searchParams }: PlayPageProps) {
  await requireCurrentUser();
  const { code } = await params;
  const query = await searchParams;
  const nicknameParam = Array.isArray(query.nickname) ? query.nickname[0] : query.nickname;

  return <PlayGameClient code={code.toUpperCase()} nickname={nicknameParam ?? null} />;
}
