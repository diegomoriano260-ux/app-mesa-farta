// Modelos prontos (estilo Tactiq): um toque e a IA escreve a partir da transcrição.
export type Template = { id: string; nome: string; emoji: string; pedido: string };

export const TEMPLATES: Template[] = [
  { id: "post", nome: "Post para Instagram", emoji: "📸", pedido: "Escreva uma legenda de post para Instagram com gancho na primeira linha, 3 parágrafos curtos, chamada para ação e 5 hashtags." },
  { id: "carrossel", nome: "Roteiro de carrossel", emoji: "🗂️", pedido: "Crie um roteiro de carrossel de 7 a 10 slides: título do slide 1 chamativo, um ponto por slide, último slide com chamada para ação." },
  { id: "reels", nome: "Roteiros de Reels", emoji: "🎬", pedido: "Escreva 3 roteiros de Reels de até 45 segundos baseados no conteúdo: gancho, desenvolvimento e final, com indicação de cena." },
  { id: "blog", nome: "Artigo de blog", emoji: "📝", pedido: "Escreva um artigo de blog otimizado para SEO com título, introdução, subtítulos, conclusão e uma meta descrição." },
  { id: "email", nome: "E-mail / newsletter", emoji: "✉️", pedido: "Escreva um e-mail de newsletter com assunto, pré-cabeçalho, texto curto e chamada para ação." },
  { id: "ata", nome: "Ata de reunião", emoji: "📋", pedido: "Escreva uma ata: participantes citados, assuntos discutidos, decisões tomadas, pendências com responsáveis e prazos." },
  { id: "tarefas", nome: "Lista de tarefas", emoji: "✅", pedido: "Liste todas as tarefas e próximos passos citados, com responsável e prazo quando mencionados, em formato de checklist." },
  { id: "faq", nome: "Perguntas frequentes", emoji: "❓", pedido: "Crie de 8 a 12 perguntas frequentes com respostas curtas baseadas no que foi dito." },
  { id: "titulos", nome: "Títulos e thumbnails", emoji: "💡", pedido: "Sugira 10 títulos chamativos para YouTube e 5 textos curtos para a thumbnail." },
  { id: "citacoes", nome: "Frases de impacto", emoji: "💬", pedido: "Extraia as 10 melhores frases ditas no vídeo, exatamente como foram ditas, com o minuto de cada uma." },
];
