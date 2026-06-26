begin;

insert into plan_catalog (role, name, slug, price_cents, billing_interval, features) values
  ('business_owner', 'Empresa grátis', 'business-free', 0, 'month', '["perfil simples", "whatsapp", "endereço"]'),
  ('business_owner', 'Empresa destaque', 'business-featured', 4990, 'month', '["perfil completo", "promoções", "banner", "selo verificado"]'),
  ('driver', 'Motorista mensal', 'driver-monthly', 2990, 'month', '["receber chamadas", "ficar online", "histórico", "destaque por avaliação"]'),
  ('provider', 'Prestador básico', 'provider-basic', 1990, 'month', '["orçamentos", "mensagens", "avaliações"]')
on conflict (slug) do nothing;

insert into business_categories (name, slug, icon_key) values
  ('Mercado', 'mercado', 'Co'),
  ('Farmácia', 'farmacia', 'Fa'),
  ('Restaurante', 'restaurante', 'Re'),
  ('Assistência técnica', 'assistencia-tecnica', 'Te'),
  ('Oficina', 'oficina', 'Of'),
  ('Salão e barbearia', 'salao-barbearia', 'Sa')
on conflict (slug) do nothing;

insert into service_categories (name, slug) values
  ('Eletricista', 'eletricista'),
  ('Encanador', 'encanador'),
  ('Técnico de informática', 'tecnico-informatica'),
  ('Refrigeração', 'refrigeracao'),
  ('Diarista', 'diarista'),
  ('Frete', 'frete'),
  ('Manicure', 'manicure'),
  ('Pedreiro', 'pedreiro'),
  ('Chaveiro', 'chaveiro'),
  ('Mecânico', 'mecanico')
on conflict (slug) do nothing;

with inserted_user as (
  insert into users (phone, email, status)
  values ('61999990000', 'morador@jardimabc.local', 'active')
  on conflict (email) do update set status = excluded.status
  returning id
)
insert into profiles (user_id, full_name, display_name, neighborhood, gender, whatsapp)
select id, 'Moradora Exemplo', 'Moradora', 'Jardim ABC', 'female', '61999990000'
from inserted_user
on conflict (user_id) do nothing;

insert into user_roles (user_id, role, status)
select id, 'resident', 'active' from users where email = 'morador@jardimabc.local'
on conflict (user_id, role) do nothing;

with driver_user as (
  insert into users (phone, email, status)
  values ('61999991111', 'motorista@jardimabc.local', 'active')
  on conflict (email) do update set status = excluded.status
  returning id
)
insert into profiles (user_id, full_name, display_name, neighborhood, gender, whatsapp)
select id, 'Ana Motorista', 'Ana', 'Jardim ABC', 'female', '61999991111'
from driver_user
on conflict (user_id) do nothing;

insert into user_roles (user_id, role, status)
select id, 'resident', 'active' from users where email = 'motorista@jardimabc.local'
on conflict (user_id, role) do nothing;

insert into user_roles (user_id, role, status, approved_at)
select id, 'driver', 'active', now() from users where email = 'motorista@jardimabc.local'
on conflict (user_id, role) do nothing;

insert into driver_profiles (
  user_id,
  document_status,
  vehicle_model,
  vehicle_plate,
  vehicle_color,
  is_online,
  is_available_for_women_only_request,
  average_rating
)
select id, 'approved', 'Fiat Argo', 'ABC1D23', 'Prata', true, true, 4.9
from users
where email = 'motorista@jardimabc.local'
on conflict (user_id) do nothing;

with owner_user as (
  insert into users (phone, email, status)
  values ('61999992222', 'empresa@jardimabc.local', 'active')
  on conflict (email) do update set status = excluded.status
  returning id
)
insert into profiles (user_id, full_name, display_name, neighborhood, gender, whatsapp)
select id, 'Silva Mercado LTDA', 'Mercado Silva', 'Jardim ABC', 'prefer_not_to_say', '61999992222'
from owner_user
on conflict (user_id) do nothing;

insert into user_roles (user_id, role, status)
select id, 'resident', 'active' from users where email = 'empresa@jardimabc.local'
on conflict (user_id, role) do nothing;

insert into user_roles (user_id, role, status, approved_at)
select id, 'business_owner', 'active', now() from users where email = 'empresa@jardimabc.local'
on conflict (user_id, role) do nothing;

insert into businesses (
  owner_user_id,
  category_id,
  name,
  slug,
  description,
  whatsapp,
  address_text,
  opening_hours,
  is_verified,
  is_featured,
  status
)
select
  u.id,
  bc.id,
  'Mercado Silva',
  'mercado-silva',
  'Mercado local com entrega no Jardim ABC.',
  '61999992222',
  'Avenida Principal, Jardim ABC',
  '{"seg-sex":"07:00-20:00","sab":"07:00-18:00"}',
  true,
  true,
  'approved'
from users u
join business_categories bc on bc.slug = 'mercado'
where u.email = 'empresa@jardimabc.local'
on conflict (slug) do nothing;

insert into products (business_id, name, description, price_cents, stock_quantity, is_active)
select id, 'Cesta básica local', 'Itens essenciais para entrega no bairro.', 12990, 20, true
from businesses
where slug = 'mercado-silva'
on conflict do nothing;

insert into bus_routes (name, description)
values ('Jardim ABC / Centro', 'Linha principal do Jardim ABC para o Centro')
on conflict do nothing;

insert into bus_schedules (route_id, departure_time, weekdays)
select id, '07:30', array[1,2,3,4,5] from bus_routes where name = 'Jardim ABC / Centro'
on conflict do nothing;

insert into bus_schedules (route_id, departure_time, weekdays)
select id, '08:10', array[1,2,3,4,5] from bus_routes where name = 'Jardim ABC / Centro'
on conflict do nothing;

insert into news (title, slug, summary, body, category, is_urgent, status, published_at)
values (
  'Bem-vindo ao Super App do Bairro',
  'bem-vindo-super-app-bairro',
  'A plataforma local do Jardim ABC está nascendo.',
  'Notícias, comércio, motoristas, serviços e oportunidades em um só lugar.',
  'Comunidade',
  false,
  'approved',
  now()
)
on conflict (slug) do nothing;

-- Usuário Admin (Jeisson)
with admin_user as (
  insert into users (phone, email, status)
  values ('61999993333', 'admin@jardimabc.local', 'active')
  on conflict (email) do update set status = excluded.status
  returning id
)
insert into profiles (user_id, full_name, display_name, neighborhood, gender, whatsapp)
select id, 'Jeisson Administrador', 'Jeisson', 'Jardim ABC', 'male', '61999993333'
from admin_user
on conflict (user_id) do nothing;

insert into user_roles (user_id, role, status, approved_at)
select id, 'admin', 'active', now() from users where email = 'admin@jardimabc.local'
on conflict (user_id, role) do nothing;

commit;
