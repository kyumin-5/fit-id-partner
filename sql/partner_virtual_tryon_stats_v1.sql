-- Aggregated partner-only VTON statistics. Does not expose consumer photos, IDs or records.
-- Requires the current authenticated user to own the requested shop.
create or replace function public.get_partner_virtual_tryon_stats_v1(p_shop_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
with authorized as (
  select s.id
  from public.shops s
  where s.id = p_shop_id
    and s.owner_user_id = (select auth.uid())
), scoped as (
  select upper(coalesce(v.status,'')) as status
  from public.virtual_tryon_events v
  join public.products p on p.id = v.product_id
  join authorized s on s.id = p.shop_id
)
select jsonb_build_object(
  'total', count(*)::integer,
  'succeeded', count(*) filter (where status in ('COMPLETED','SUCCEEDED'))::integer,
  'failed', count(*) filter (where status in ('FAILED','CANCELED'))::integer,
  'running', count(*) filter (where status in ('STARTED','RUNNING','PENDING','PROCESSING'))::integer
)
from scoped;
$function$;

revoke all on function public.get_partner_virtual_tryon_stats_v1(uuid) from public;
revoke all on function public.get_partner_virtual_tryon_stats_v1(uuid) from anon;
grant execute on function public.get_partner_virtual_tryon_stats_v1(uuid) to authenticated;
