import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import MessageList from "@/components/admin/message-list";

export default async function AdminMessagesPage() {
  await requireAdmin();
  const messages = await prisma.message.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { event: { select: { name: true } } } });
  return <div className="mx-auto max-w-7xl px-6 py-8 sm:px-10 lg:px-12"><p className="text-sm text-[#789ab2]">Workspace</p><h1 className="mt-2 font-serif text-4xl">Messages</h1><p className="mt-2 text-sm text-[#7e9eb5]">Ucapan tamu dari semua event.</p><div className="mt-8"><MessageList messages={messages.map((message) => ({ id: message.id, name: message.name, content: message.content, createdAt: message.createdAt.toISOString(), eventName: message.event.name }))} /></div></div>;
}
