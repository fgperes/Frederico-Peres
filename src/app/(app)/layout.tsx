import { requireUser } from "@/lib/session";
import { Nav } from "@/components/nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-1">
      <Nav
        roles={user.roles}
        name={user.name ?? ""}
        email={user.email ?? ""}
      />
      <main className="flex-1 overflow-y-auto bg-stone-50 p-8">
        {children}
      </main>
    </div>
  );
}
