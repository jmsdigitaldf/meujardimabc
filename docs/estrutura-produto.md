# Estrutura do Produto

## Visão

O Super App do Bairro centraliza a vida prática do Jardim ABC: informação, economia local, mobilidade, serviços, oportunidades e comunicação comunitária.

## Modelo de conta

A conta principal deve ser sempre de morador para usuários comuns. Motorista, empresário e prestador não precisam ser contas separadas: são ativações dentro da mesma conta de morador.

O admin fica fora dessa regra. Ele deve ser uma permissão separada, controlada e auditada.

Benefícios:

- um login para tudo;
- histórico e mensagens centralizados;
- menos atrito no cadastro;
- assinatura por módulo;
- usuário pode ser morador, motorista, empresário e prestador ao mesmo tempo;
- admin pode bloquear apenas um módulo sem excluir a conta inteira.

## Perfis

- Morador: perfil base. Consome notícias, compra, solicita corridas, publica anúncios, conversa e avalia.
- Empresário: ativação dentro da conta de morador. Gerencia loja, produtos, promoções, pedidos, mensagens, planos e relatórios.
- Motorista: ativação dentro da conta de morador. Recebe corridas, controla status, histórico, ganhos, avaliações e assinatura.
- Prestador: ativação dentro da conta de morador. Recebe pedidos de orçamento, agenda serviços e conversa com clientes.
- Redator: permissão editorial para criar notícias, alertas, eventos e moderar comentários.
- Admin: permissão separada para controlar usuários, empresas, pagamentos, conteúdos, denúncias, banners e categorias.

## Corridas com motorista mulher

O fluxo de corrida deve permitir a opção "preferir motorista mulher" para passageiras.

Regras sugeridas:

- a opção aparece no pedido de corrida;
- motoristas informam e verificam o gênero no cadastro, com cuidado de privacidade;
- se houver motorista mulher online, ela é priorizada na busca;
- se não houver, o app avisa antes de buscar outros motoristas;
- a escolha deve ser tratada como recurso de segurança e conforto para passageiras;
- o admin deve monitorar abuso, denúncias e disponibilidade.

## Módulos

- Notícias e alertas.
- Guia comercial.
- Marketplace local.
- Motoristas.
- Delivery.
- Serviços.
- Ônibus.
- Eventos.
- Empregos.
- Emergência e utilidade pública.
- Achados e perdidos.
- Clube de descontos.
- Chat e notificações.
- Painéis por ativação.
- Administração.

## Modelo de dados inicial

- users
- profiles
- user_roles
- role_subscriptions
- businesses
- business_categories
- business_profiles
- products
- orders
- drivers
- driver_profiles
- rides
- service_providers
- provider_profiles
- service_requests
- news
- events
- marketplace_ads
- bus_routes
- bus_schedules
- notifications
- reviews
- messages
- subscriptions
- payments
- banners
- reports
- coupons
- favorites
- admin_logs

## Fases sugeridas

### Fase 1: MVP local

Home, guia comercial, notícias, motoristas, serviços, marketplace simples, ônibus e admin básico.

### Fase 2: Conta única e ativações

Morador como conta base, ativação de motorista, ativação de empresa, assinatura por módulo e permissões internas.

### Fase 3: Monetização

Planos de empresa, planos de motorista, impulsionamentos, banners, cupons, pagamentos e relatórios.

### Fase 4: Operação em tempo real

Chat, push, corridas com status, opção de motorista mulher, delivery, prestadores com orçamento e moderação avançada.

### Fase 5: Inteligência

Assistente local para buscas, criação de anúncios, campanhas para empresas, resumo de denúncias e apoio editorial.
