import type { Metadata } from "next";

export const metadata: Metadata = { title: "Exclusão de dados · Ativa Aline", robots: { index: true, follow: true } };

export default function ExclusaoDeDados() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 leading-relaxed">
      <h1 className="text-2xl font-bold">Como pedir a exclusão dos seus dados</h1>
      <ol className="mt-6 list-decimal space-y-3 pl-5 text-[15px]">
        <li>Envie uma mensagem direta para <b>@aline.moriano.nutri</b> no Instagram com o texto <b>“excluir meus dados”</b>.</li>
        <li>Em até 30 dias, apagamos tudo o que temos sobre a sua conta: identificador, nome de usuário, comentários, mensagens e etiquetas.</li>
        <li>Você recebe uma confirmação pelo Direct quando a exclusão estiver feita.</li>
      </ol>
      <p className="mt-6 text-[15px]">Você também pode remover o acesso do app nas configurações do Instagram, em <b>Apps e sites</b>. Veja também a nossa <a className="text-brand-600 underline" href="/privacidade">política de privacidade</a>.</p>
    </main>
  );
}
