-- MVP test policy: allow public client access to these three tables.
-- Run this in Supabase SQL Editor for the current prototype only.
alter table shops enable row level security;
alter table products enable row level security;
alter table product_sizes enable row level security;

create policy "mvp shops read" on shops for select to anon using (true);
create policy "mvp shops insert" on shops for insert to anon with check (true);
create policy "mvp products read" on products for select to anon using (true);
create policy "mvp products insert" on products for insert to anon with check (true);
create policy "mvp products delete" on products for delete to anon using (true);
create policy "mvp sizes read" on product_sizes for select to anon using (true);
create policy "mvp sizes insert" on product_sizes for insert to anon with check (true);
