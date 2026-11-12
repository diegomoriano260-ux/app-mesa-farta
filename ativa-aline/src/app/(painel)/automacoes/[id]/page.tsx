import { notFound } from "next/navigation";
import { AutomationForm } from "../form";
import { loadAutomation, loadChannels, loadPosts } from "../data";
import { deleteAutomation } from "../actions";
import { ConfirmButton } from "@/components/confirm-button";

export default async function EditarAutomacao({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [a, channels] = await Promise.all([loadAutomation(id), loadChannels()]);
  if (!a) notFound();
  const posts = await loadPosts(channels);
  return (
    <div className="pb-20 md:pb-0">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className=" text-[26px] font-bold tracking-tight">Editar automação</h1>
        <form action={deleteAutomation}>
          <input type="hidden" name="id" value={id} />
          <ConfirmButton message="Excluir esta automação? Não dá para desfazer." className="btn-danger">Excluir</ConfirmButton>
        </form>
      </div>
      <AutomationForm initial={a} channels={channels} posts={posts} />
    </div>
  );
}
