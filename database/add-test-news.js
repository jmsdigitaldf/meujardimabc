import db from '../db.js';

async function addTestNews() {
  console.log("Conectando ao banco de dados para adicionar notícias de teste reais...");

  try {
    const news = [
      {
        title: "Nova iluminação de LED instalada na avenida principal do Jardim ABC",
        summary: "Equipes iniciaram a troca das lâmpadas antigas por novas de LED para melhorar a segurança à noite.",
        body: "A substituição das lâmpadas faz parte do plano de melhoria da infraestrutura urbana de Cidade Ocidental e do Jardim ABC. Moradores relatam que a via ficou muito mais clara e segura para o tráfego de pedestres e veículos.",
        category: "Obras"
      },
      {
        title: "Mutirão de vacinação no Posto de Saúde neste sábado",
        summary: "Campanha de atualização de caderneta de vacinação e vacina da gripe das 08h às 17h.",
        body: "O posto de saúde do Jardim ABC estará de plantão neste sábado para atender moradores de todas as idades. É necessário apresentar documento com foto, cartão do SUS e a caderneta de vacinação.",
        category: "Saúde"
      },
      {
        title: "Polícia Militar intensifica patrulhamento noturno no comércio",
        summary: "Ação preventiva visa aumentar a segurança de pedestres e comerciantes do Jardim ABC.",
        body: "A pedido da associação comercial e de moradores do Jardim ABC, a Polícia Militar reforçou o policiamento ostensivo durante o horário de fechamento das lojas e nas principais paradas de ônibus do bairro.",
        category: "Polícia"
      }
    ];

    for (const n of news) {
      const slug = `news-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await db.query(
        `INSERT INTO news (title, slug, summary, body, category, status, published_at, is_urgent)
         VALUES ($1, $2, $3, $4, $5, 'approved', now(), false)`,
        [n.title, slug, n.summary, n.body, n.category]
      );
      console.log(`Notícia inserida: ${n.title}`);
    }

    console.log("Notícias de teste cadastradas com sucesso!");
    process.exit(0);
  } catch (err) {
    console.error("Erro ao cadastrar notícias:", err.message);
    process.exit(1);
  }
}

addTestNews();
