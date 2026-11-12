import { notFound } from "next/navigation";
import { AutomationForm } from "../form";
import { loadAutomation, loadChannels, loadPosts } from "../data";
import { deleteAutomation } from "../actions";

export default async function EditarAutomacao({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [a, channels] = await Promise.all([loadAutomation(id), loadChannels()]);
  if (!a) notFound();
  const posts = await loadPosts(channels);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Editar automação</h1>
        <form action={deleteAutomation}>
          <input type="hidden" name="id" value={id} />
          <button className="btn-danger">Excluir</button>
        </form>
      </div>
      <AutomationForm initial={a} channels={channels} posts={posts} />
    </div>
  );
}
