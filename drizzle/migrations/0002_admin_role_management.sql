GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
DROP POLICY IF EXISTS "roles read own or admin" ON public.user_roles;
CREATE POLICY "roles read own or admin" ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE(id uuid, email text, full_name text, roles app_role[], created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden: administrators only'; end if;
  return query select u.id, u.email::text, coalesce(p.full_name,''),
    coalesce(array_agg(r.role) filter (where r.role is not null), '{}'), u.created_at
  from auth.users u left join public.profiles p on p.id=u.id left join public.user_roles r on r.user_id=u.id
  group by u.id, p.full_name order by u.created_at;
end $$;

CREATE OR REPLACE FUNCTION public.admin_set_role(_user_id uuid, _role app_role, _grant boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden: administrators only'; end if;
  if _grant then
    insert into public.user_roles(user_id, role) select _user_id, _role
    where not exists (select 1 from public.user_roles where user_id=_user_id and role=_role);
  else
    if _role = 'admin' and (select count(*) from public.user_roles where role='admin') <= 1 then
      raise exception 'Cannot remove the last administrator';
    end if;
    delete from public.user_roles where user_id=_user_id and role=_role;
  end if;
  insert into public.audit_logs(actor_name, action, entity_type, entity_ref, details)
  values (coalesce((select full_name from public.profiles where id=auth.uid()),'admin'),
    case when _grant then 'role_granted' else 'role_revoked' end, 'user', _user_id::text, _role::text);
end $$;

REVOKE ALL ON FUNCTION public.admin_list_users() FROM public, anon;
REVOKE ALL ON FUNCTION public.admin_set_role(uuid, app_role, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid, app_role, boolean) TO authenticated;

DROP POLICY IF EXISTS "settings admin write" ON public.system_settings;
GRANT UPDATE ON public.system_settings TO authenticated;
CREATE POLICY "settings admin write" ON public.system_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));