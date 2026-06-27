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


-- Inserir Linhas de Ônibus
insert into bus_routes (name, description) values
  ('8002 - Jardim ABC / Rodoviária do Plano Piloto (via Gilberto Salomão)', 'Linha Jardim ABC para a Rodoviária do Plano Piloto via Lago Sul / comércio do Gilberto Salomão.'),
  ('8003 - Jardim ABC / Rodoviária do Plano Piloto (via L2 Sul / Esplanada)', 'Linha Jardim ABC para a Rodoviária do Plano Piloto via L2 Sul e Esplanada dos Ministérios.'),
  ('8004 - Jardim ABC / W3 Sul (via QI 15 / Aeroporto)', 'Linha Jardim ABC para a W3 Sul via QI 15 do Lago Sul e balão do Aeroporto.'),
  ('8015.1 - Jardim ABC / Rodoviária do Plano Piloto (via Ponte JK)', 'Linha rápida Jardim ABC para a Rodoviária do Plano Piloto via Ponte JK.'),
  ('8076 - Jardim ABC / Cidade Ocidental (Integração)', 'Linha de integração entre o Jardim ABC e o centro da Cidade Ocidental.'),
  ('0.170 - Viação Barreiros', 'Sentido de circulação: Barreiros / Rodoviária do Plano Piloto (Via DF-140 / Jardim Botânico).'),
  ('170.1 - Viação Barreiros', 'Sentido de circulação: Barreiros / Rodoviária do Plano Piloto (Via São Sebastião / Ponte Costa e Silva).'),
  ('170.2 - Viação Barreiros', 'Sentido de circulação: Barreiros / Rodoviária do Plano Piloto (Via Ponte JK / L2 Sul).'),
  ('170.4 - Viação Barreiros', 'Sentido de circulação: Barreiros / Rodoviária do Plano Piloto (Via W3 Sul / Esplanada).'),
  ('170.5 - Viação Barreiros', 'Sentido de circulação: Barreiros / Rodoviária do Plano Piloto (Via Lago Sul / Gilberto Salomão).'),
  ('170.6 - Viação Barreiros', 'Sentido de circulação: Barreiros / Rodoviária do Plano Piloto (Via Esplanada / L2 Norte).'),
  ('Micro-ônibus', 'Sentido de circulação: Jardim ABC / Cidade Ocidental / Valparaíso / Novo Gama.')
on conflict do nothing;

-- Inserir Horários (8002)
insert into bus_schedules (route_id, departure_time, notes)
select id, t::time, 'Segunda a Sexta' from bus_routes, unnest(array['06:00', '06:40', '07:20', '08:00', '12:00', '13:30', '17:10', '18:30', '19:50']) t
where name = '8002 - Jardim ABC / Rodoviária do Plano Piloto (via Gilberto Salomão)';

-- Inserir Horários (8003)
insert into bus_schedules (route_id, departure_time, notes)
select id, t::time, 'Segunda a Sexta' from bus_routes, unnest(array['06:15', '07:00', '08:30', '12:30', '14:00', '16:45', '17:45', '19:00']) t
where name = '8003 - Jardim ABC / Rodoviária do Plano Piloto (via L2 Sul / Esplanada)';

-- Inserir Horários (8004)
insert into bus_schedules (route_id, departure_time, notes)
select id, t::time, 'Segunda a Sexta' from bus_routes, unnest(array['05:50', '06:30', '07:15', '08:15', '11:45', '13:00', '17:30', '18:15']) t
where name = '8004 - Jardim ABC / W3 Sul (via QI 15 / Aeroporto)';

-- Inserir Horários (8015.1)
insert into bus_schedules (route_id, departure_time, notes)
select id, t::time, 'Segunda a Sexta' from bus_routes, unnest(array['06:10', '07:10', '08:20', '12:15', '13:45', '17:00', '18:00', '19:15']) t
where name = '8015.1 - Jardim ABC / Rodoviária do Plano Piloto (via Ponte JK)';

-- Inserir Horários (8076)
insert into bus_schedules (route_id, departure_time, notes)
select id, t::time, 'Segunda a Sexta' from bus_routes, unnest(array['05:30', '06:30', '07:30', '08:30', '10:30', '12:30', '14:30', '16:30', '17:30', '18:30', '19:30', '20:30']) t
where name = '8076 - Jardim ABC / Cidade Ocidental (Integração)';

-- Inserir Horários (0.170)
insert into bus_schedules (route_id, departure_time, notes)
select id, t::time, 'Segunda a Sexta' from bus_routes, unnest(array['06:10', '17:00']) t
where name = '0.170 - Viação Barreiros';

-- Inserir Horários (170.1)
insert into bus_schedules (route_id, departure_time, notes)
select id, t::time, 'Segunda a Sexta' from bus_routes, unnest(array['05:15', '07:30', '17:35']) t
where name = '170.1 - Viação Barreiros';

-- Inserir Horários (170.2)
insert into bus_schedules (route_id, departure_time, notes)
select id, t::time, 'Segunda a Sexta' from bus_routes, unnest(array['05:45', '18:00']) t
where name = '170.2 - Viação Barreiros';

-- Inserir Horários (170.4)
insert into bus_schedules (route_id, departure_time, notes)
select id, t::time, 'Segunda a Sexta' from bus_routes, unnest(array['06:25']) t
where name = '170.4 - Viação Barreiros';

-- Inserir Horários (170.5)
insert into bus_schedules (route_id, departure_time, notes)
select id, t::time, 'Segunda a Sexta' from bus_routes, unnest(array['12:00']) t
where name = '170.5 - Viação Barreiros';

-- Inserir Horários (170.6)
insert into bus_schedules (route_id, departure_time, notes)
select id, t::time, 'Segunda a Sexta' from bus_routes, unnest(array['18:30']) t
where name = '170.6 - Viação Barreiros';

-- Inserir Horários (Micro-ônibus)
insert into bus_schedules (route_id, departure_time, notes)
select id, t::time, 'Segunda a Sexta' from bus_routes, unnest(array[
  '06:00', '06:20', '06:40', '07:00', '07:20', '07:40', '08:00', '08:20', '08:40', '09:00',
  '10:00', '11:00', '12:00', '12:20', '12:40', '13:00', '13:20', '13:40', '14:00', '15:00',
  '16:00', '16:20', '16:40', '17:00', '17:20', '17:40', '18:00', '18:20', '18:40', '19:00',
  '20:00', '21:00', '22:00'
]) t
where name = 'Micro-ônibus';

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

commit;
