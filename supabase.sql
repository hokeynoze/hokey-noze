-- Hokejové nože 3.0 – spoločná databáza
-- Spusť v Supabase SQL Editor.

create table if not exists public.knives (
  id uuid primary key default gen_random_uuid(),
  kod text not null unique,
  znacka text not null,
  model text not null,
  velkost text,
  vyska text,
  stav text not null default 'Aktuálne',
  nakup numeric default 0,
  predaj numeric default 0,
  moc numeric default 0,
  poznamka text,
  shipping jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.knives enable row level security;

drop policy if exists "authenticated can read knives" on public.knives;
drop policy if exists "authenticated can insert knives" on public.knives;
drop policy if exists "authenticated can update knives" on public.knives;
drop policy if exists "authenticated can delete knives" on public.knives;

create policy "authenticated can read knives"
on public.knives for select to authenticated using (true);

create policy "authenticated can insert knives"
on public.knives for insert to authenticated with check (true);

create policy "authenticated can update knives"
on public.knives for update to authenticated using (true) with check (true);

create policy "authenticated can delete knives"
on public.knives for delete to authenticated using (true);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists knives_updated_at on public.knives;
create trigger knives_updated_at
before update on public.knives
for each row execute function public.touch_updated_at();

-- Realtime: v prípade potreby zapni v Dashboarde pre tabuľku knives.
