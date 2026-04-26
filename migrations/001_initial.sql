-- 001_initial.sql
-- Per-user state tables for piemonte-site v1. Spec: site/PRD.md section 5.2.
-- Catalog stays in static JSON; no foreign keys back to it.

create table favorites (
  id           bigserial primary key,
  user_name    text not null check (user_name in ('brooks','angela')),
  entity_type  text not null,
  entity_slug  text not null,
  created_at   timestamptz not null default now(),
  unique (user_name, entity_type, entity_slug)
);

create table itinerary_items (
  id            bigserial primary key,
  user_name     text not null check (user_name in ('brooks','angela')),
  entity_type   text,
  entity_slug   text,
  position      integer not null,
  note          text,
  custom_title  text,
  custom_body   text,
  time_anchor   text,
  created_at    timestamptz not null default now(),
  check (
    (entity_type is not null and entity_slug is not null)
    or (custom_title is not null)
  )
);

create table calendar_items (
  id            bigserial primary key,
  user_name     text not null check (user_name in ('brooks','angela')),
  entity_type   text,
  entity_slug   text,
  on_date       date not null,
  time_anchor   text,
  note          text,
  custom_title  text,
  custom_body   text,
  created_at    timestamptz not null default now(),
  check (
    (entity_type is not null and entity_slug is not null)
    or (custom_title is not null)
  )
);
