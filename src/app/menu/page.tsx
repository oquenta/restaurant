import MenuApp from "@/components/MenuApp";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ mesa?: string }> }) {
  const { mesa } = await searchParams;
  const n = Number(mesa);
  return <MenuApp mesa={Number.isInteger(n) && n > 0 ? n : null} />;
}
