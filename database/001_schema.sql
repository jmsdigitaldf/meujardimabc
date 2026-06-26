begin;

create extension if not exists pgcrypto;
create extension if not exists citext;

create type user_status as enum ('active', 'pending', 'blocked', 'deleted');
create type user_role as enum ('resident', 'driver', 'business_owner', 'provider', 'editor', 'admin');
create type role_status as enum ('pending', 'active', 'rejected', 'suspended');
create type gender_identity as enum ('female', 'male', 'non_binary', 'prefer_not_to_say');
create type payment_status as enum ('pending', 'paid', 'failed', 'refunded', 'cancelled');
create type subscription_status as enum ('trialing', 'active', 'past_due', 'cancelled', 'expired');
create type ride_status as enum (
  'requested',
  'waiting_driver',
  'accepted',
  'driver_on_way',
  'passenger_boarded',
  'in_progress',
  'completed',
  'cancelled'
);
create type order_status as enum ('received', 'preparing', 'out_for_delivery', 'delivered', 'cancelled');
create type moderation_status as enum ('pending', 'approved', 'rejected', 'archived');
create type report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table users (
  id uuid primary key default gen_random_uuid(),
  phone varchar(20) unique,
  email citext unique,
  password_hash text,
  status user_status not null default 'pending',
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_contact_required check (phone is not null or email is not null)
);

create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  full_name text not null,
  display_name text,
  avatar_url text,
  neighborhood text not null default 'Jardim ABC',
  address_text text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  gender gender_identity,
  birthdate date,
  whatsapp varchar(20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  role user_role not null,
  status role_status not null default 'pending',
  approved_by uuid references users(id),
  approved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, role)
);

create table plan_catalog (
  id uuid primary key default gen_random_uuid(),
  role user_role not null,
  name text not null,
  slug text not null unique,
  price_cents integer not null default 0 check (price_cents >= 0),
  billing_interval text not null default 'month',
  features jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table role_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_role_id uuid not null references user_roles(id) on delete cascade,
  plan_id uuid not null references plan_catalog(id),
  status subscription_status not null default 'trialing',
  starts_at timestamptz not null default now(),
  renews_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table business_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon_key text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table businesses (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references users(id) on delete cascade,
  category_id uuid references business_categories(id),
  name text not null,
  slug text not null unique,
  description text,
  logo_url text,
  cover_url text,
  whatsapp varchar(20),
  phone varchar(20),
  address_text text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  opening_hours jsonb not null default '{}'::jsonb,
  is_verified boolean not null default false,
  is_featured boolean not null default false,
  status moderation_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  description text,
  image_url text,
  price_cents integer not null check (price_cents >= 0),
  stock_quantity integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  buyer_user_id uuid not null references users(id),
  business_id uuid not null references businesses(id),
  status order_status not null default 'received',
  delivery_address text,
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  delivery_fee_cents integer not null default 0 check (delivery_fee_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  payment_method text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id),
  name_snapshot text not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now()
);

create table driver_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  document_status moderation_status not null default 'pending',
  vehicle_model text,
  vehicle_plate text,
  vehicle_color text,
  accepts_cash boolean not null default true,
  accepts_pix boolean not null default true,
  accepts_card boolean not null default false,
  service_areas text[] not null default array['Jardim ABC'],
  is_online boolean not null default false,
  is_available_for_women_only_request boolean not null default false,
  average_rating numeric(3, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table rides (
  id uuid primary key default gen_random_uuid(),
  passenger_user_id uuid not null references users(id),
  driver_user_id uuid references users(id),
  status ride_status not null default 'requested',
  origin_text text not null,
  destination_text text not null,
  origin_latitude numeric(10, 7),
  origin_longitude numeric(10, 7),
  destination_latitude numeric(10, 7),
  destination_longitude numeric(10, 7),
  estimated_price_cents integer check (estimated_price_cents >= 0),
  final_price_cents integer check (final_price_cents >= 0),
  passenger_prefers_female_driver boolean not null default false,
  female_driver_required boolean not null default false,
  payment_method text,
  requested_at timestamptz not null default now(),
  accepted_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_active boolean not null default true
);

create table provider_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  bio text,
  service_area text not null default 'Jardim ABC',
  document_status moderation_status not null default 'pending',
  is_available boolean not null default true,
  average_rating numeric(3, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table provider_services (
  provider_id uuid not null references provider_profiles(id) on delete cascade,
  category_id uuid not null references service_categories(id),
  primary key (provider_id, category_id)
);

create table service_requests (
  id uuid primary key default gen_random_uuid(),
  customer_user_id uuid not null references users(id),
  provider_user_id uuid references users(id),
  category_id uuid references service_categories(id),
  title text not null,
  description text not null,
  photo_url text,
  address_text text,
  status text not null default 'open',
  budget_cents integer check (budget_cents >= 0),
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table news (
  id uuid primary key default gen_random_uuid(),
  author_user_id uuid references users(id),
  title text not null,
  slug text not null unique,
  summary text,
  body text not null,
  category text not null,
  cover_url text,
  is_urgent boolean not null default false,
  status moderation_status not null default 'pending',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table events (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid references users(id),
  title text not null,
  description text,
  image_url text,
  location_text text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status moderation_status not null default 'pending',
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table marketplace_ads (
  id uuid primary key default gen_random_uuid(),
  seller_user_id uuid not null references users(id),
  title text not null,
  description text,
  category text not null,
  price_cents integer check (price_cents >= 0),
  image_urls text[] not null default '{}',
  status moderation_status not null default 'pending',
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table bus_routes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table bus_stops (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references bus_routes(id) on delete cascade,
  name text not null,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  stop_order integer not null default 0
);

create table bus_schedules (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references bus_routes(id) on delete cascade,
  departure_time time not null,
  weekdays smallint[] not null default array[1,2,3,4,5],
  notes text
);

create table coupons (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  code text not null,
  title text not null,
  description text,
  discount_type text not null,
  discount_value integer not null,
  starts_at timestamptz,
  ends_at timestamptz,
  max_uses integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (business_id, code)
);

create table banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text,
  target_url text,
  placement text not null default 'home',
  starts_at timestamptz,
  ends_at timestamptz,
  status moderation_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  subject text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table conversation_participants (
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  primary key (conversation_id, user_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_user_id uuid not null references users(id),
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_user_id uuid not null references users(id),
  target_type text not null,
  target_id uuid not null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  status moderation_status not null default 'approved',
  created_at timestamptz not null default now()
);

create table favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid references users(id),
  target_type text not null,
  target_id uuid,
  reason text not null,
  description text,
  status report_status not null default 'open',
  assigned_admin_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  subscription_id uuid references role_subscriptions(id),
  order_id uuid references orders(id),
  amount_cents integer not null check (amount_cents >= 0),
  status payment_status not null default 'pending',
  method text not null,
  provider text,
  provider_reference text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table admin_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references users(id),
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_profiles_user_id on profiles(user_id);
create index idx_user_roles_user_role_status on user_roles(user_id, role, status);
create index idx_businesses_category_status on businesses(category_id, status);
create index idx_businesses_search on businesses using gin (to_tsvector('portuguese', coalesce(name, '') || ' ' || coalesce(description, '')));
create index idx_products_business_active on products(business_id, is_active);
create index idx_driver_profiles_online on driver_profiles(is_online, is_available_for_women_only_request);
create index idx_rides_passenger_status on rides(passenger_user_id, status);
create index idx_rides_driver_status on rides(driver_user_id, status);
create index idx_news_status_published on news(status, published_at desc);
create index idx_marketplace_search on marketplace_ads using gin (to_tsvector('portuguese', coalesce(title, '') || ' ' || coalesce(description, '')));
create index idx_messages_conversation_created on messages(conversation_id, created_at);
create index idx_notifications_user_read on notifications(user_id, read_at);
create index idx_reports_status on reports(status, created_at desc);

create trigger set_users_updated_at before update on users for each row execute function set_updated_at();
create trigger set_profiles_updated_at before update on profiles for each row execute function set_updated_at();
create trigger set_user_roles_updated_at before update on user_roles for each row execute function set_updated_at();
create trigger set_plan_catalog_updated_at before update on plan_catalog for each row execute function set_updated_at();
create trigger set_role_subscriptions_updated_at before update on role_subscriptions for each row execute function set_updated_at();
create trigger set_businesses_updated_at before update on businesses for each row execute function set_updated_at();
create trigger set_products_updated_at before update on products for each row execute function set_updated_at();
create trigger set_orders_updated_at before update on orders for each row execute function set_updated_at();
create trigger set_driver_profiles_updated_at before update on driver_profiles for each row execute function set_updated_at();
create trigger set_rides_updated_at before update on rides for each row execute function set_updated_at();
create trigger set_provider_profiles_updated_at before update on provider_profiles for each row execute function set_updated_at();
create trigger set_service_requests_updated_at before update on service_requests for each row execute function set_updated_at();
create trigger set_news_updated_at before update on news for each row execute function set_updated_at();
create trigger set_events_updated_at before update on events for each row execute function set_updated_at();
create trigger set_marketplace_ads_updated_at before update on marketplace_ads for each row execute function set_updated_at();
create trigger set_banners_updated_at before update on banners for each row execute function set_updated_at();
create trigger set_conversations_updated_at before update on conversations for each row execute function set_updated_at();
create trigger set_reports_updated_at before update on reports for each row execute function set_updated_at();
create trigger set_payments_updated_at before update on payments for each row execute function set_updated_at();

create view v_user_capabilities as
select
  u.id as user_id,
  p.full_name,
  bool_or(ur.role = 'resident' and ur.status = 'active') as can_use_resident_area,
  bool_or(ur.role = 'driver' and ur.status = 'active') as can_drive,
  bool_or(ur.role = 'business_owner' and ur.status = 'active') as can_manage_business,
  bool_or(ur.role = 'provider' and ur.status = 'active') as can_offer_services,
  bool_or(ur.role = 'editor' and ur.status = 'active') as can_publish_news,
  bool_or(ur.role = 'admin' and ur.status = 'active') as can_admin
from users u
join profiles p on p.user_id = u.id
left join user_roles ur on ur.user_id = u.id
group by u.id, p.full_name;

commit;
