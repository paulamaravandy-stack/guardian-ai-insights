ALTER TABLE public.members ADD COLUMN IF NOT EXISTS member_number text;
CREATE UNIQUE INDEX IF NOT EXISTS members_member_number_uq ON public.members (upper(member_number)) WHERE member_number IS NOT NULL;
UPDATE public.members m SET member_number = 'OSU-' || lpad(s.rn::text, 4, '0')
FROM (SELECT id, row_number() OVER (ORDER BY joined_at, id) rn FROM public.members) s
WHERE s.id = m.id AND m.member_number IS NULL;

ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS joined_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS left_at timestamptz;
ALTER TABLE public.group_members ADD CONSTRAINT group_members_status_chk CHECK (status IN ('active','inactive'));
CREATE UNIQUE INDEX IF NOT EXISTS group_members_active_uq ON public.group_members (group_id, member_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS group_members_member_idx ON public.group_members (member_id);

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_id uuid;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS operation_ref text;
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON public.audit_logs (action, created_at DESC);

-- Membership changes are administrator-only from now on
DROP POLICY IF EXISTS "gm write" ON public.group_members;
CREATE POLICY "gm admin write" ON public.group_members FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public._admin_guard() RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
    raise exception 'Forbidden: administrators only' using errcode = '42501';
  end if;
  return coalesce((select nullif(full_name,'') from public.profiles where id = auth.uid()), 'admin');
end $$;
REVOKE ALL ON FUNCTION public._admin_guard() FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.admin_add_member_to_group(_member_id uuid, _group_id uuid, _reason text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare _actor text := public._admin_guard(); _ref text := 'OP-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
begin
  if not exists (select 1 from members where id=_member_id) then raise exception 'Member not found'; end if;
  if not exists (select 1 from groups where id=_group_id) then raise exception 'Group not found'; end if;
  if exists (select 1 from group_members where member_id=_member_id and group_id=_group_id and status='active') then
    raise exception 'This member is already an active member of the selected group'; end if;
  insert into group_members(group_id, member_id, status, joined_at) values (_group_id, _member_id, 'active', now());
  insert into audit_logs(actor_id, actor_name, action, entity_type, entity_ref, operation_ref, details)
  values (auth.uid(), _actor, 'MEMBER_ADDED', 'member', _member_id::text, _ref,
    jsonb_build_object('member_id',_member_id,'to_group_id',_group_id,'reason',_reason)::text);
  return _ref;
end $$;

CREATE OR REPLACE FUNCTION public.admin_register_member(_full_name text, _member_number text, _phone text, _national_id text, _group_id uuid, _reason text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare _actor text := public._admin_guard(); _id uuid; _ref text := 'OP-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
begin
  _full_name := btrim(coalesce(_full_name,'')); _member_number := nullif(btrim(coalesce(_member_number,'')),'');
  if length(_full_name) < 2 or length(_full_name) > 100 then raise exception 'Full name must be 2-100 characters'; end if;
  if _member_number is null then raise exception 'Member number is required'; end if;
  if exists (select 1 from members where upper(member_number)=upper(_member_number)) then raise exception 'Member number % is already in use', _member_number; end if;
  if _group_id is not null and not exists (select 1 from groups where id=_group_id) then raise exception 'Group not found'; end if;
  insert into members(full_name, member_number, phone, national_id) values (_full_name, _member_number, nullif(btrim(_phone),''), nullif(btrim(_national_id),'')) returning id into _id;
  if _group_id is not null then insert into group_members(group_id, member_id) values (_group_id, _id); end if;
  insert into audit_logs(actor_id, actor_name, action, entity_type, entity_ref, operation_ref, details)
  values (auth.uid(), _actor, 'MEMBER_ADDED', 'member', _id::text, _ref,
    jsonb_build_object('member_id',_id,'new_member',true,'member_number',_member_number,'to_group_id',_group_id,'reason',_reason)::text);
  return _id;
end $$;

CREATE OR REPLACE FUNCTION public.admin_transfer_member(_member_id uuid, _from_group uuid, _to_group uuid, _reason text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare _actor text := public._admin_guard(); _ref text := 'OP-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
begin
  if _from_group = _to_group then raise exception 'Source and destination groups must be different'; end if;
  if not exists (select 1 from groups where id=_to_group) then raise exception 'Destination group not found'; end if;
  update group_members set status='inactive', left_at=now()
    where member_id=_member_id and group_id=_from_group and status='active';
  if not found then raise exception 'Member has no active membership in the source group'; end if;
  if exists (select 1 from group_members where member_id=_member_id and group_id=_to_group and status='active') then
    raise exception 'Member is already active in the destination group'; end if;
  insert into group_members(group_id, member_id) values (_to_group, _member_id);
  insert into audit_logs(actor_id, actor_name, action, entity_type, entity_ref, operation_ref, details)
  values (auth.uid(), _actor, 'MEMBER_TRANSFERRED', 'member', _member_id::text, _ref,
    jsonb_build_object('member_id',_member_id,'from_group_id',_from_group,'to_group_id',_to_group,'reason',_reason)::text);
  return _ref;
end $$;

CREATE OR REPLACE FUNCTION public.admin_swap_members(_member_a uuid, _group_a uuid, _member_b uuid, _group_b uuid, _reason text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare _actor text := public._admin_guard(); _ref text := 'OP-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
begin
  if _member_a = _member_b then raise exception 'Cannot swap a member with themselves'; end if;
  if _group_a = _group_b then raise exception 'Both members are in the same group; choose two different groups'; end if;
  update group_members set status='inactive', left_at=now() where member_id=_member_a and group_id=_group_a and status='active';
  if not found then raise exception 'First member has no active membership in the first group'; end if;
  update group_members set status='inactive', left_at=now() where member_id=_member_b and group_id=_group_b and status='active';
  if not found then raise exception 'Second member has no active membership in the second group'; end if;
  if exists (select 1 from group_members where member_id=_member_a and group_id=_group_b and status='active') then
    raise exception 'First member is already active in the second group'; end if;
  if exists (select 1 from group_members where member_id=_member_b and group_id=_group_a and status='active') then
    raise exception 'Second member is already active in the first group'; end if;
  insert into group_members(group_id, member_id) values (_group_b, _member_a), (_group_a, _member_b);
  insert into audit_logs(actor_id, actor_name, action, entity_type, entity_ref, operation_ref, details)
  values (auth.uid(), _actor, 'MEMBERS_SWAPPED', 'member', _member_a::text || ',' || _member_b::text, _ref,
    jsonb_build_object('member_a',_member_a,'from_group_a',_group_a,'to_group_a',_group_b,
                       'member_b',_member_b,'from_group_b',_group_b,'to_group_b',_group_a,'reason',_reason)::text);
  return _ref;
end $$;

REVOKE ALL ON FUNCTION public.admin_add_member_to_group(uuid,uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_register_member(text,text,text,text,uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_transfer_member(uuid,uuid,uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_swap_members(uuid,uuid,uuid,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_add_member_to_group(uuid,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_register_member(text,text,text,text,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_transfer_member(uuid,uuid,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_swap_members(uuid,uuid,uuid,uuid,text) TO authenticated;