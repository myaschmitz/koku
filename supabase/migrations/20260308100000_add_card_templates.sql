-- Card templates table
create table card_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  content text not null default '',
  icon text not null default 'file',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- RLS
alter table card_templates enable row level security;

create policy "Users can manage their own templates"
  on card_templates for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Index
create index idx_card_templates_user on card_templates (user_id);

-- Add default template setting to user_settings
-- Values: "flashcard", "no-template", or a UUID referencing card_templates.id
alter table user_settings add column default_template text default 'flashcard';
