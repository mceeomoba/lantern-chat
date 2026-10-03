-- Lantern core schema (P1 chat + P5 admin foundations). Run in the Supabase SQL editor.
-- Auth model: username + password. The app maps username -> <username>@users.lantern.example (synthetic, never emailed).
create extension if not exists pgcrypto;

create table public.profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null default '' check (char_length(display_name)<=40),
  bio text not null default '' check (char_length(bio)<=160),
  role text not null default 'user' check (role in ('user','admin')),
  banned_until timestamptz,
  created_at timestamptz not null default now()
);
create table public.chats(
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('dm','group')),
  title text check (char_length(title)<=60),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create table public.chat_members(
  chat_id uuid references public.chats(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member','owner')),
  last_read_at timestamptz not null default now(),
  primary key(chat_id,user_id)
);
create table public.messages(
  id bigint generated always as identity primary key,
  chat_id uuid not null references public.chats(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  body text not null check (char_length(body) between 1 and 2000),
  reply_to bigint references public.messages(id) on delete set null,
  expires_at timestamptz,
  removed boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.messages(chat_id,created_at desc);
create table public.blocks(
  blocker uuid references public.profiles(id) on delete cascade,
  blocked uuid references public.profiles(id) on delete cascade,
  primary key(blocker,blocked)
);
create table public.reports(
  id bigint generated always as identity primary key,
  reporter uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('user','message','post')),
  target_id text not null,
  reason text not null check (char_length(reason) between 1 and 500),
  status text not null default 'open' check (status in ('open','actioned','dismissed')),
  created_at timestamptz not null default now()
);
create table public.audit_log(
  id bigint generated always as identity primary key,
  admin_id uuid references public.profiles(id),
  action text not null, detail jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.app_config(key text primary key, value jsonb not null);
insert into public.app_config values ('announcement','""'),('signups_open','true'),('max_msg_per_minute','30');

-- helpers
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as
$$ select exists(select 1 from profiles where id=auth.uid() and role='admin') $$;
create or replace function public.is_active() returns boolean language sql stable security definer set search_path=public as
$$ select exists(select 1 from profiles where id=auth.uid() and (banned_until is null or banned_until<now())) $$;
create or replace function public.is_member(c uuid) returns boolean language sql stable security definer set search_path=public as
$$ select exists(select 1 from chat_members where chat_id=c and user_id=auth.uid()) $$;

-- new auth user -> profile (username comes from signup metadata, validated by the check constraint)
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not coalesce((select (value)::text='true' from app_config where key='signups_open'),true) then raise exception 'signups closed'; end if;
  insert into profiles(id,username,display_name) values (new.id, lower(new.raw_user_meta_data->>'username'), coalesce(new.raw_user_meta_data->>'username',''));
  return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- users may not change their own role/ban
create or replace function public.guard_profile() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() and (new.role is distinct from old.role or new.banned_until is distinct from old.banned_until or new.username is distinct from old.username) then
    raise exception 'not allowed'; end if;
  return new; end $$;
create trigger guard_profile before update on public.profiles for each row execute function public.guard_profile();

-- rate limit + ban + block enforcement on send
create or replace function public.guard_message() returns trigger language plpgsql security definer set search_path=public as $$
declare lim int; n int;
begin
  if new.sender_id <> auth.uid() then raise exception 'sender mismatch'; end if;
  if not public.is_active() then raise exception 'account suspended'; end if;
  if not public.is_member(new.chat_id) then raise exception 'not a member'; end if;
  select (value)::text::int into lim from app_config where key='max_msg_per_minute';
  select count(*) into n from messages where sender_id=new.sender_id and created_at>now()-interval '1 minute';
  if n >= coalesce(lim,30) then raise exception 'slow down'; end if;
  if exists(select 1 from chats c join chat_members m on m.chat_id=c.id and m.user_id<>new.sender_id join blocks b on b.blocker=m.user_id and b.blocked=new.sender_id where c.id=new.chat_id and c.kind='dm') then
    raise exception 'blocked'; end if;
  return new; end $$;
create trigger guard_message before insert on public.messages for each row execute function public.guard_message();

-- create or fetch a 1:1 chat
create or replace function public.open_dm(other uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare cid uuid;
begin
  if other=auth.uid() or not public.is_active() then raise exception 'invalid'; end if;
  select c.id into cid from chats c where c.kind='dm'
    and exists(select 1 from chat_members where chat_id=c.id and user_id=auth.uid())
    and exists(select 1 from chat_members where chat_id=c.id and user_id=other) limit 1;
  if cid is null then
    insert into chats(kind,created_by) values('dm',auth.uid()) returning id into cid;
    insert into chat_members(chat_id,user_id) values(cid,auth.uid()),(cid,other);
  end if; return cid; end $$;
create or replace function public.create_group(t text, members uuid[]) returns uuid language plpgsql security definer set search_path=public as $$
declare cid uuid; m uuid;
begin
  if not public.is_active() then raise exception 'suspended'; end if;
  insert into chats(kind,title,created_by) values('group',left(t,60),auth.uid()) returning id into cid;
  insert into chat_members(chat_id,user_id,role) values(cid,auth.uid(),'owner');
  foreach m in array members loop
    if m<>auth.uid() then insert into chat_members(chat_id,user_id) values(cid,m) on conflict do nothing; end if;
  end loop; return cid; end $$;
create or replace function public.admin_ban(uid uuid, hours int, why text) returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  update profiles set banned_until = case when hours is null then null else now()+make_interval(hours=>hours) end where id=uid;
  insert into audit_log(admin_id,action,detail) values(auth.uid(),'ban',jsonb_build_object('user',uid,'hours',hours,'why',why));
end $$;
create or replace function public.admin_remove_message(mid bigint) returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  update messages set removed=true where id=mid;
  insert into audit_log(admin_id,action,detail) values(auth.uid(),'remove_message',jsonb_build_object('message',mid));
end $$;

-- RLS
alter table profiles enable row level security; alter table chats enable row level security;
alter table chat_members enable row level security; alter table messages enable row level security;
alter table blocks enable row level security; alter table reports enable row level security;
alter table audit_log enable row level security; alter table app_config enable row level security;

create policy prof_read on profiles for select to authenticated using (true);
create policy prof_upd on profiles for update to authenticated using (id=auth.uid() or public.is_admin()) with check (id=auth.uid() or public.is_admin());
create policy chats_read on chats for select to authenticated using (public.is_member(id) or public.is_admin());
create policy mem_read on chat_members for select to authenticated using (public.is_member(chat_id) or user_id=auth.uid() or public.is_admin());
create policy mem_upd_self on chat_members for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy mem_leave on chat_members for delete to authenticated using (user_id=auth.uid());
create policy msg_read on messages for select to authenticated using ((public.is_member(chat_id) and (expires_at is null or expires_at>now())) or public.is_admin());
create policy msg_ins on messages for insert to authenticated with check (sender_id=auth.uid());
create policy blk_all on blocks for all to authenticated using (blocker=auth.uid()) with check (blocker=auth.uid());
create policy rep_ins on reports for insert to authenticated with check (reporter=auth.uid());
create policy rep_read on reports for select to authenticated using (reporter=auth.uid() or public.is_admin());
create policy rep_admin_upd on reports for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy audit_read on audit_log for select to authenticated using (public.is_admin());
create policy cfg_read on app_config for select to authenticated using (true);
create policy cfg_admin on app_config for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant execute on function public.open_dm(uuid), public.create_group(text,uuid[]), public.admin_ban(uuid,int,text), public.admin_remove_message(bigint) to authenticated;
alter publication supabase_realtime add table public.messages;
-- Bootstrap the first admin by hand (never from the app):  update profiles set role='admin' where username='<your-username>';
