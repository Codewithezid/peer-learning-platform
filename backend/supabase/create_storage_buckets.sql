-- ============================================================
-- Create required Supabase Storage buckets for Peer Connect
-- Run once in Supabase SQL Editor
-- ============================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('resource-files', 'resource-files', true)
on conflict (id) do nothing;

