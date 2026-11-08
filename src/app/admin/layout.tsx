import { getAdminUser } from "@/lib/auth";
import AdminNavigation from "@/components/admin/admin-navigation";
import { prisma } from "@/lib/prisma";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await getAdminUser();
  if (!user) return <>{children}</>;
  const activeEvent = await prisma.event.findFirst({ where: { active: true }, orderBy: { updatedAt: "desc" }, select: { slug: true } });

  return (
    <div className="min-h-screen bg-[#f4f6f5] text-[#2b3a46] lg:flex">
      <AdminNavigation userName={user.name ?? ""} userEmail={user.email} activeEventSlug={activeEvent?.slug ?? null} />
      <main className="min-w-0 flex-1 pb-24 lg:pb-0">{children}</main>
    </div>
  );
}
