-- Roles enum and user_roles
create type public.app_role as enum ('admin','collector','group_leader','member','auditor');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  avatar_url text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles read own" on public.profiles for select to authenticated using (auth.uid() = id or public.has_role(auth.uid(),'admin'));
create policy "profiles update own" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "profiles insert own" on public.profiles for insert to authenticated with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''));
  insert into public.user_roles (user_id, role) values (new.id, 'member');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Groups
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  contribution_amount numeric not null default 0,
  cycle_length_weeks int not null default 12,
  status text not null default 'active',
  leader_name text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.groups to authenticated;
grant all on public.groups to service_role;
alter table public.groups enable row level security;
create policy "groups read" on public.groups for select to authenticated using (true);
create policy "groups write" on public.groups for all to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'group_leader') or public.has_role(auth.uid(),'collector'));

-- Members
create table public.members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  national_id text,
  status text not null default 'active',
  risk_score int not null default 10,
  joined_at date not null default current_date
);
grant select, insert, update, delete on public.members to authenticated;
grant all on public.members to service_role;
alter table public.members enable row level security;
create policy "members read" on public.members for select to authenticated using (true);
create policy "members write" on public.members for all to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'group_leader') or public.has_role(auth.uid(),'collector'));

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade not null,
  member_id uuid references public.members(id) on delete cascade not null,
  payout_position int,
  unique (group_id, member_id)
);
grant select, insert, update, delete on public.group_members to authenticated;
grant all on public.group_members to service_role;
alter table public.group_members enable row level security;
create policy "gm read" on public.group_members for select to authenticated using (true);
create policy "gm write" on public.group_members for all to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'group_leader') or public.has_role(auth.uid(),'collector'));

-- Contributions
create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade not null,
  member_id uuid references public.members(id) on delete cascade not null,
  amount numeric not null,
  source text not null default 'cash',
  reference text,
  collector_name text,
  contributed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.contributions to authenticated;
grant all on public.contributions to service_role;
alter table public.contributions enable row level security;
create policy "contrib read" on public.contributions for select to authenticated using (true);
create policy "contrib write" on public.contributions for all to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'group_leader') or public.has_role(auth.uid(),'collector'));

-- Evidence sources
create table public.mobile_money_records (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id) on delete cascade,
  amount numeric not null,
  provider text,
  reference text,
  transacted_at timestamptz not null default now()
);
grant select, insert on public.mobile_money_records to authenticated;
grant all on public.mobile_money_records to service_role;
alter table public.mobile_money_records enable row level security;
create policy "mm read" on public.mobile_money_records for select to authenticated using (true);

create table public.bank_records (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id) on delete cascade,
  amount numeric not null,
  bank_name text,
  reference text,
  transacted_at timestamptz not null default now()
);
grant select, insert on public.bank_records to authenticated;
grant all on public.bank_records to service_role;
alter table public.bank_records enable row level security;
create policy "bank read" on public.bank_records for select to authenticated using (true);

-- Fraud alerts (explainable)
create table public.fraud_alerts (
  id uuid primary key default gen_random_uuid(),
  alert_code text not null,
  member_id uuid references public.members(id) on delete set null,
  group_id uuid references public.groups(id) on delete set null,
  contribution_id uuid references public.contributions(id) on delete set null,
  alert_type text not null,
  risk_level text not null default 'low',
  risk_score int not null default 0,
  confidence numeric not null default 0,
  explanation text not null,
  contributing_factors jsonb not null default '[]',
  status text not null default 'open',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.fraud_alerts to authenticated;
grant all on public.fraud_alerts to service_role;
alter table public.fraud_alerts enable row level security;
create policy "alerts read" on public.fraud_alerts for select to authenticated using (true);
create policy "alerts write" on public.fraud_alerts for all to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'auditor'));

-- Audit logs
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_name text not null,
  action text not null,
  entity_type text not null,
  entity_ref text,
  details text,
  created_at timestamptz not null default now()
);
grant select, insert on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create policy "audit read" on public.audit_logs for select to authenticated using (true);
create policy "audit insert" on public.audit_logs for insert to authenticated with check (true);

-- Reports
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  report_type text not null,
  generated_by text,
  created_at timestamptz not null default now()
);
grant select, insert on public.reports to authenticated;
grant all on public.reports to service_role;
alter table public.reports enable row level security;
create policy "reports read" on public.reports for select to authenticated using (true);
create policy "reports insert" on public.reports for insert to authenticated with check (true);

-- System settings
create table public.system_settings (
  key text primary key,
  value text not null
);
grant select on public.system_settings to authenticated;
grant all on public.system_settings to service_role;
alter table public.system_settings enable row level security;
create policy "settings read" on public.system_settings for select to authenticated using (true);

-- ================= SEED DATA =================
insert into public.groups (id, name, location, contribution_amount, cycle_length_weeks, status, leader_name) values
 ('11111111-1111-1111-1111-111111111101','Market Women Osusu','Freetown - Congo Market',50000,12,'active','Aminata Sesay'),
 ('11111111-1111-1111-1111-111111111102','Teachers Savings Circle','Bo City',100000,16,'active','Mohamed Bangura'),
 ('11111111-1111-1111-1111-111111111103','Okada Riders Union','Kenema',25000,10,'active','Ibrahim Koroma'),
 ('11111111-1111-1111-1111-111111111104','Tailors Cooperative','Makeni',75000,14,'active','Fatmata Kamara'),
 ('11111111-1111-1111-1111-111111111105','Fishermen Association','Lungi',60000,12,'suspended','Sahr Turay');

insert into public.members (id, full_name, phone, national_id, status, risk_score, joined_at) values
 ('22222222-2222-2222-2222-222222222201','Aminata Sesay','+232 76 111 001','SL-1001','active',8,'2025-01-12'),
 ('22222222-2222-2222-2222-222222222202','Mohamed Bangura','+232 76 111 002','SL-1002','active',12,'2025-01-15'),
 ('22222222-2222-2222-2222-222222222203','Ibrahim Koroma','+232 76 111 003','SL-1003','active',22,'2025-02-02'),
 ('22222222-2222-2222-2222-222222222204','Fatmata Kamara','+232 76 111 004','SL-1004','active',9,'2025-02-10'),
 ('22222222-2222-2222-2222-222222222205','Sahr Turay','+232 76 111 005','SL-1005','suspended',74,'2025-02-18'),
 ('22222222-2222-2222-2222-222222222206','Mariama Conteh','+232 76 111 006','SL-1006','active',15,'2025-03-01'),
 ('22222222-2222-2222-2222-222222222207','Abu Bakarr','+232 76 111 007','SL-1007','active',31,'2025-03-05'),
 ('22222222-2222-2222-2222-222222222208','Isatu Jalloh','+232 76 111 008','SL-1008','active',11,'2025-03-12'),
 ('22222222-2222-2222-2222-222222222209','Foday Sankoh','+232 76 111 009','SL-1009','active',58,'2025-03-20'),
 ('22222222-2222-2222-2222-222222222210','Hawa Dumbuya','+232 76 111 010','SL-1010','active',7,'2025-04-01'),
 ('22222222-2222-2222-2222-222222222211','Alie Mansaray','+232 76 111 011','SL-1011','active',19,'2025-04-09'),
 ('22222222-2222-2222-2222-222222222212','Zainab Kamara','+232 76 111 012','SL-1012','active',14,'2025-04-15');

insert into public.group_members (group_id, member_id, payout_position) values
 ('11111111-1111-1111-1111-111111111101','22222222-2222-2222-2222-222222222201',1),
 ('11111111-1111-1111-1111-111111111101','22222222-2222-2222-2222-222222222206',2),
 ('11111111-1111-1111-1111-111111111101','22222222-2222-2222-2222-222222222208',3),
 ('11111111-1111-1111-1111-111111111102','22222222-2222-2222-2222-222222222202',1),
 ('11111111-1111-1111-1111-111111111102','22222222-2222-2222-2222-222222222210',2),
 ('11111111-1111-1111-1111-111111111102','22222222-2222-2222-2222-222222222212',3),
 ('11111111-1111-1111-1111-111111111103','22222222-2222-2222-2222-222222222203',1),
 ('11111111-1111-1111-1111-111111111103','22222222-2222-2222-2222-222222222207',2),
 ('11111111-1111-1111-1111-111111111104','22222222-2222-2222-2222-222222222204',1),
 ('11111111-1111-1111-1111-111111111104','22222222-2222-2222-2222-222222222209',2),
 ('11111111-1111-1111-1111-111111111105','22222222-2222-2222-2222-222222222205',1),
 ('11111111-1111-1111-1111-111111111105','22222222-2222-2222-2222-222222222211',2);

insert into public.contributions (id, group_id, member_id, amount, source, reference, collector_name, contributed_at) values
 ('33333333-3333-3333-3333-333333333301','11111111-1111-1111-1111-111111111101','22222222-2222-2222-2222-222222222201',50000,'mobile_money','MM-88421','Collector James','2026-09-28 09:14'),
 ('33333333-3333-3333-3333-333333333302','11111111-1111-1111-1111-111111111101','22222222-2222-2222-2222-222222222206',50000,'mobile_money','MM-88422','Collector James','2026-09-28 09:20'),
 ('33333333-3333-3333-3333-333333333303','11111111-1111-1111-1111-111111111102','22222222-2222-2222-2222-222222222202',100000,'bank_transfer','BK-11209','Collector James','2026-09-29 10:02'),
 ('33333333-3333-3333-3333-333333333304','11111111-1111-1111-1111-111111111103','22222222-2222-2222-2222-222222222207',25000,'cash','CSH-3301','Collector Musa','2026-09-29 12:41'),
 ('33333333-3333-3333-3333-333333333305','11111111-1111-1111-1111-111111111104','22222222-2222-2222-2222-222222222209',120000,'mobile_money','MM-88450','Collector Musa','2026-09-30 08:11'),
 ('33333333-3333-3333-3333-333333333306','11111111-1111-1111-1111-111111111105','22222222-2222-2222-2222-222222222205',60000,'cash','CSH-3302','Collector Musa','2026-09-30 15:33'),
 ('33333333-3333-3333-3333-333333333307','11111111-1111-1111-1111-111111111102','22222222-2222-2222-2222-222222222210',100000,'bank_transfer','BK-11210','Collector James','2026-10-01 09:00'),
 ('33333333-3333-3333-3333-333333333308','11111111-1111-1111-1111-111111111101','22222222-2222-2222-2222-222222222208',50000,'mobile_money','MM-88461','Collector James','2026-10-01 11:26'),
 ('33333333-3333-3333-3333-333333333309','11111111-1111-1111-1111-111111111103','22222222-2222-2222-2222-222222222203',25000,'cash','CSH-3303','Collector Musa','2026-10-02 14:05'),
 ('33333333-3333-3333-3333-333333333310','11111111-1111-1111-1111-111111111104','22222222-2222-2222-2222-222222222204',75000,'mobile_money','MM-88472','Collector James','2026-10-03 10:48'),
 ('33333333-3333-3333-3333-333333333311','11111111-1111-1111-1111-111111111102','22222222-2222-2222-2222-222222222212',95000,'bank_transfer','BK-11215','Collector James','2026-10-04 09:37'),
 ('33333333-3333-3333-3333-333333333312','11111111-1111-1111-1111-111111111101','22222222-2222-2222-2222-222222222201',50000,'mobile_money','MM-88421','Collector James','2026-10-05 09:15');

insert into public.mobile_money_records (member_id, amount, provider, reference, transacted_at) values
 ('22222222-2222-2222-2222-222222222201',50000,'Orange Money','MM-88421','2026-09-28 09:14'),
 ('22222222-2222-2222-2222-222222222206',50000,'Africell Money','MM-88422','2026-09-28 09:20'),
 ('22222222-2222-2222-2222-222222222208',50000,'Orange Money','MM-88461','2026-10-01 11:26'),
 ('22222222-2222-2222-2222-222222222204',75000,'Africell Money','MM-88472','2026-10-03 10:48');

insert into public.bank_records (member_id, amount, bank_name, reference, transacted_at) values
 ('22222222-2222-2222-2222-222222222202',100000,'Rokel Commercial Bank','BK-11209','2026-09-29 10:02'),
 ('22222222-2222-2222-2222-222222222210',100000,'Sierra Leone Commercial Bank','BK-11210','2026-10-01 09:00'),
 ('22222222-2222-2222-2222-222222222212',95000,'Rokel Commercial Bank','BK-11215','2026-10-04 09:37');

insert into public.fraud_alerts (alert_code, member_id, group_id, contribution_id, alert_type, risk_level, risk_score, confidence, explanation, contributing_factors, status) values
 ('ALT-2026-0001','22222222-2222-2222-2222-222222222209','11111111-1111-1111-1111-111111111104','33333333-3333-3333-3333-333333333305','contribution_manipulation','high',82,0.91,'Contribution flagged because the recorded amount (SLE 120,000) is 60% higher than the expected cycle amount (SLE 75,000) and no matching mobile money transaction was found in Source B.','["Amount deviates +60% from cycle expectation","No mobile money evidence in Source B","Collector recorded 3 similar overrides this month"]'::jsonb,'open'),
 ('ALT-2026-0002','22222222-2222-2222-2222-222222222205','11111111-1111-1111-1111-111111111105','33333333-3333-3333-3333-333333333306','collector_fraud','critical',94,0.96,'Cash contribution recorded by Collector Musa has no supporting evidence in any source, and the member is currently suspended. Pattern matches 2 prior unverified cash entries by the same collector.','["Cash entry with zero corroborating evidence","Member suspended at time of contribution","Collector has 2 prior unverified entries"]'::jsonb,'open'),
 ('ALT-2026-0003','22222222-2222-2222-2222-222222222201','11111111-1111-1111-1111-111111111101','33333333-3333-3333-3333-333333333312','duplicate_contribution','medium',55,0.88,'Duplicate contribution detected: reference MM-88421 was used for two separate contribution records 7 days apart. The mobile money ledger shows only one transaction for this reference.','["Same transaction reference reused","Single mobile money record for two contributions"]'::jsonb,'under_review'),
 ('ALT-2026-0004','22222222-2222-2222-2222-222222222207','11111111-1111-1111-1111-111111111103','33333333-3333-3333-3333-333333333304','late_payment','low',28,0.72,'Contribution arrived 6 days after the cycle deadline. Member has a history of 2 late payments in the last 3 cycles.','["6 days past cycle deadline","2 prior late payments"]'::jsonb,'resolved'),
 ('ALT-2026-0005','22222222-2222-2222-2222-222222222211','11111111-1111-1111-1111-111111111105',null,'missing_contribution','high',77,0.85,'Missing contribution detected: member has no recorded contribution for cycle week 4 while all other group members contributed. No evidence found in Sources B, C, or D.','["No contribution record for week 4","No evidence across all sources","All peers contributed on time"]'::jsonb,'open'),
 ('ALT-2026-0006','22222222-2222-2222-2222-222222222212','11111111-1111-1111-1111-111111111102','33333333-3333-3333-3333-333333333311','amount_mismatch','medium',48,0.79,'Bank transfer amount (SLE 95,000) is 5% below the expected cycle amount (SLE 100,000). Bank record confirms the lower amount, so this is a genuine shortfall rather than a recording error.','["5% shortfall vs cycle amount","Bank evidence confirms lower amount"]'::jsonb,'under_review');

insert into public.audit_logs (actor_name, action, entity_type, entity_ref, details, created_at) values
 ('Admin','created_group','group','Fishermen Association','Group created with 12-week cycle','2026-09-20 08:00'),
 ('Collector James','recorded_contribution','contribution','MM-88421','SLE 50,000 from Aminata Sesay','2026-09-28 09:14'),
 ('Collector Musa','recorded_contribution','contribution','CSH-3302','SLE 60,000 cash from Sahr Turay','2026-09-30 15:33'),
 ('AI Engine','flagged_contribution','fraud_alert','ALT-2026-0002','Collector fraud pattern detected, confidence 0.96','2026-09-30 15:34'),
 ('Auditor','reviewed_alert','fraud_alert','ALT-2026-0004','Late payment alert marked resolved','2026-10-02 16:20'),
 ('Admin','suspended_member','member','Sahr Turay','Member suspended pending investigation','2026-10-03 10:00'),
 ('AI Engine','flagged_contribution','fraud_alert','ALT-2026-0003','Duplicate reference MM-88421 detected','2026-10-05 09:16');

insert into public.reports (title, report_type, generated_by) values
 ('September 2026 Fraud Summary','fraud','Admin'),
 ('Market Women Osusu - Group Report','group','Aminata Sesay'),
 ('Q3 2026 Contribution Report','contribution','Admin'),
 ('Annual Audit Trail Export','audit','Auditor');

insert into public.system_settings (key, value) values
 ('risk_threshold_high','70'),
 ('risk_threshold_critical','85'),
 ('currency','SLE'),
 ('ai_engine_version','OsusuGuard XAI v2.4');