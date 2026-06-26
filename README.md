# Meu Jardim ABC 🌳

O aplicativo oficial da comunidade do Jardim ABC. Uma plataforma digital local pensada para centralizar informação, economia, ônibus, mural comunitário e serviços em um único lugar.

Aesthetics style: **Airbnb + Nubank**.

---

## 🛠️ Tecnologias do MVP

- **Frontend**: HTML5, Vanilla CSS3 (Design System customizado com Inter Font) e JavaScript assíncrono.
- **Backend**: Node.js com Express e PostgreSQL Driver (`pg`).
- **Banco de Dados**: Supabase (PostgreSQL na nuvem com enums, triggers e views).

---

## 🚀 Como abrir e rodar o projeto localmente

Como o backend está integrado com o banco de dados Supabase na nuvem, você não precisa configurar um banco local!

1. Instale as dependências:
```bash
npm install
```

2. Crie ou configure o arquivo `.env` na raiz do projeto com as credenciais do seu Supabase:
```env
PORT=4173
DATABASE_URL=postgresql://postgres:[SENHA_DO_BANCO]@db.phtajnrgniryhgjyzcoy.supabase.co:5432/postgres
SUPABASE_URL=https://phtajnrgniryhgjyzcoy.supabase.co
SUPABASE_ANON_KEY=[SUA_ANON_KEY]
```

3. Configure a estrutura inicial do banco de dados (se for um banco novo):
```bash
npm run db:setup:js
```

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

5. Acesse no seu navegador:
`http://localhost:4173`

---

## 👥 Perfis de Teste no Desenvolvimento

Você pode alternar entre os usuários e ver diferentes painéis e permissões clicando no botão de **perfil (👤 / ⚙️)** no canto superior direito do cabeçalho da aplicação. O app irá alternar entre:

1. **Morador Comum** (Moradora Exemplo)
2. **Motorista** (Ana)
3. **Dono de Empresa** (Mercado Silva)
4. **Administrador** (Jeisson) - Fornece acesso ao **Painel Administrativo** na aba Perfil.

---

## ⚙️ Funcionalidades do Painel Administrativo

Ao entrar no perfil do **Jeisson (Admin)**, vá em **Perfil** ➔ **Painel Administrativo** para gerenciar:
- **Notícias**: Criar e excluir notícias comunitárias.
- **Ônibus**: Planejar e adicionar horários de partida para as linhas de ônibus.
- **Anúncios**: Moderar/excluir anúncios publicados no mercado local.
- **Usuários**: Ver moradores ativos e bloquear/banir usuários se necessário.
- **Broadcast**: Disparar avisos e alertas gerais urgentes no topo da home de todos os moradores.
