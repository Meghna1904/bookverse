-- BookVerse is a no-account shared app for two readers.
-- These anon policies make this data public to anyone who knows the project URL.
create extension if not exists pgcrypto;

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Our BookVerse',
  "inviteCode" text not null default '',
  "createdAt" bigint not null default (extract(epoch from now()) * 1000)::bigint,
  "sampleSeededAt" bigint
);

create table if not exists public.profiles (
  id uuid primary key,
  "householdId" uuid not null references public.households(id) on delete cascade,
  "displayName" text not null,
  bio text not null default '',
  "avatarUrl" text,
  "favoriteGenres" text[] not null default '{}',
  languages text[] not null default '{English}',
  "shareActivity" boolean not null default true,
  "isSample" boolean not null default false,
  "joinedAt" bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  "householdId" uuid not null references public.households(id) on delete cascade,
  title text not null,
  author text not null,
  isbn text,
  description text,
  "coverUrl" text,
  genre text,
  language text,
  "pageCount" integer,
  publisher text,
  "publishedYear" integer,
  series text,
  "externalRef" text,
  format text,
  "spineColor" text,
  "isSample" boolean not null default false,
  "createdBy" uuid references public.profiles(id),
  "createdAt" bigint not null default (extract(epoch from now()) * 1000)::bigint,
  "discoveredAt" bigint
);

create table if not exists public."readingRecords" (
  id uuid primary key default gen_random_uuid(),
  "householdId" uuid not null references public.households(id) on delete cascade,
  "bookId" uuid not null references public.books(id) on delete cascade,
  "readerId" uuid not null references public.profiles(id) on delete cascade,
  mode text not null default 'individual' check (mode in ('individual','together')),
  status text not null default 'reading' check (status in ('reading','completed')),
  source text not null default 'physical' check (source in ('physical','digital')),
  "documentId" uuid,
  "startDate" bigint not null default (extract(epoch from now()) * 1000)::bigint,
  "completionDate" bigint,
  "currentPage" integer not null default 0,
  rating numeric,
  review text,
  notes text,
  "isSample" boolean not null default false,
  "createdAt" bigint not null default (extract(epoch from now()) * 1000)::bigint,
  "updatedAt" bigint not null default (extract(epoch from now()) * 1000)::bigint,
  unique ("bookId", "readerId")
);

create table if not exists public."wishlistItems" (
  id uuid primary key default gen_random_uuid(),
  "householdId" uuid not null references public.households(id) on delete cascade,
  "bookId" uuid not null references public.books(id) on delete cascade,
  "readerId" uuid not null references public.profiles(id) on delete cascade,
  priority text not null default 'someday' check (priority in ('someday','soon','next')),
  note text,
  "isSample" boolean not null default false,
  "addedAt" bigint not null default (extract(epoch from now()) * 1000)::bigint,
  unique ("bookId", "readerId")
);

create table if not exists public."libraryDocuments" (
  id uuid primary key default gen_random_uuid(),
  "householdId" uuid not null references public.households(id) on delete cascade,
  "bookId" uuid references public.books(id) on delete set null,
  "ownerId" uuid not null references public.profiles(id),
  title text not null,
  author text,
  description text,
  "fileName" text not null,
  "storagePath" text not null,
  "coverUrl" text,
  "mimeType" text not null default 'application/pdf',
  size bigint not null default 0,
  "totalPages" integer not null,
  visibility text not null default 'shared' check (visibility in ('private','shared')),
  "isSample" boolean not null default false,
  "createdAt" bigint not null default (extract(epoch from now()) * 1000)::bigint,
  "updatedAt" bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public."documentProgress" (
  id uuid primary key default gen_random_uuid(),
  "documentId" uuid not null references public."libraryDocuments"(id) on delete cascade,
  "householdId" uuid not null references public.households(id) on delete cascade,
  "readerId" uuid not null references public.profiles(id) on delete cascade,
  "lastPage" integer not null default 1,
  "totalPages" integer not null,
  minutes integer not null default 0,
  "completedAt" bigint,
  "updatedAt" bigint not null default (extract(epoch from now()) * 1000)::bigint,
  unique ("documentId", "readerId")
);

create table if not exists public."readingSessions" (
  id uuid primary key default gen_random_uuid(),
  "householdId" uuid not null references public.households(id) on delete cascade,
  "readerId" uuid not null references public.profiles(id) on delete cascade,
  "bookId" uuid references public.books(id) on delete set null,
  "documentId" uuid references public."libraryDocuments"(id) on delete set null,
  "dayKey" text not null,
  pages integer not null default 0,
  minutes integer not null default 0,
  source text not null default 'physical' check (source in ('physical','digital')),
  "isSample" boolean not null default false,
  "createdAt" bigint not null default (extract(epoch from now()) * 1000)::bigint,
  "updatedAt" bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.activity (
  id uuid primary key default gen_random_uuid(),
  "householdId" uuid not null references public.households(id) on delete cascade,
  "readerId" uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  "bookId" uuid references public.books(id) on delete set null,
  "documentId" uuid references public."libraryDocuments"(id) on delete set null,
  title text not null,
  detail text,
  "isSample" boolean not null default false,
  "createdAt" bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists books_household_idx on public.books("householdId");
create index if not exists records_household_idx on public."readingRecords"("householdId");
create index if not exists records_reader_idx on public."readingRecords"("readerId");
create index if not exists wishlist_household_idx on public."wishlistItems"("householdId");
create index if not exists documents_household_idx on public."libraryDocuments"("householdId");
create index if not exists sessions_household_day_idx on public."readingSessions"("householdId", "dayKey");

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

do $$ declare tab text; begin
  foreach tab in array array['households','profiles','books','readingRecords','wishlistItems','libraryDocuments','documentProgress','readingSessions','activity'] loop
    execute format('alter table public.%I enable row level security', tab);
    execute format('drop policy if exists "public read" on public.%I', tab);
    execute format('drop policy if exists "public insert" on public.%I', tab);
    execute format('drop policy if exists "public update" on public.%I', tab);
    execute format('drop policy if exists "public delete" on public.%I', tab);
    execute format('create policy "public read" on public.%I for select to anon, authenticated using (true)', tab);
    execute format('create policy "public insert" on public.%I for insert to anon, authenticated with check (true)', tab);
    execute format('create policy "public update" on public.%I for update to anon, authenticated using (true) with check (true)', tab);
    execute format('create policy "public delete" on public.%I for delete to anon, authenticated using (true)', tab);
  end loop;
end $$;

insert into public.households (id, name, "inviteCode") values
  ('00000000-0000-4000-8000-000000000001', 'Our BookVerse', '')
on conflict (id) do nothing;

insert into public.profiles (id, "householdId", "displayName", "favoriteGenres", languages)
values
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'Whiskeyy', '{}', '{English}'),
  ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', 'Matildaa', '{}', '{English}')
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bookverse-pdfs', 'bookverse-pdfs', true, 41943040, array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

grant select, insert, update, delete on storage.objects to anon, authenticated;

drop policy if exists "public read bookverse files" on storage.objects;
drop policy if exists "public upload bookverse files" on storage.objects;
drop policy if exists "public update bookverse files" on storage.objects;
drop policy if exists "public delete bookverse files" on storage.objects;
create policy "public read bookverse files" on storage.objects for select to anon, authenticated using (bucket_id = 'bookverse-pdfs');
create policy "public upload bookverse files" on storage.objects for insert to anon, authenticated with check (bucket_id = 'bookverse-pdfs');
create policy "public update bookverse files" on storage.objects for update to anon, authenticated using (bucket_id = 'bookverse-pdfs') with check (bucket_id = 'bookverse-pdfs');
create policy "public delete bookverse files" on storage.objects for delete to anon, authenticated using (bucket_id = 'bookverse-pdfs');
