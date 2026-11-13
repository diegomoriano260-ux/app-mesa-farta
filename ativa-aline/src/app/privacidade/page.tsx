import type { Metadata } from "next";

export const metadata: Metadata = { title: "Política de privacidade · Ativa Aline", robots: { index: true, follow: true } };

export default function Privacidade() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 leading-relaxed">
      <h1 className="text-2xl font-bold">Política de privacidade — Ativa Aline</h1>
      <p className="mt-1 text-sm text-muted">Última atualização: 13 de novembro de 2026</p>

      <div className="mt-8 space-y-6 text-[15px]">
        <section>
          <h2 className="font-semibold">Quem somos</h2>
          <p>O Ativa Aline é uma ferramenta de uso próprio da nutricionista Aline Moriano (Instagram @aline.moriano.nutri) para responder automaticamente comentários e mensagens enviadas ao perfil dela.</p>
        </section>
        <section>
          <h2 className="font-semibold">Quais dados usamos</h2>
          <p>Quando você comenta num post ou envia uma mensagem para @aline.moriano.nutri, a Meta (Instagram) nos envia: o identificador da sua conta no Instagram, seu nome de usuário, o texto do comentário ou da mensagem e a data. Não coletamos senha, e-mail, telefone ou qualquer dado além desses.</p>
        </section>
        <section>
          <h2 className="font-semibold">Para que usamos</h2>
          <p>Somente para enviar a resposta automática que você pediu (por exemplo, um link ou informação) e para que a equipe da Aline possa continuar o atendimento. Não vendemos, não alugamos e não compartilhamos seus dados com terceiros, nem usamos para publicidade.</p>
        </section>
        <section>
          <h2 className="font-semibold">Por quanto tempo guardamos</h2>
          <p>Os dados ficam guardados enquanto forem úteis para o atendimento, em servidores com acesso restrito e conexão criptografada. Você pode pedir a exclusão a qualquer momento.</p>
        </section>
        <section>
          <h2 className="font-semibold">Seus direitos (LGPD)</h2>
          <p>Você pode pedir acesso, correção ou exclusão dos seus dados. Veja como em <a className="text-brand-600 underline" href="/exclusao-de-dados">Exclusão de dados</a>, ou envie uma mensagem direta para @aline.moriano.nutri no Instagram.</p>
        </section>
      </div>
    </main>
  );
}
