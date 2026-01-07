# Supabase Cloud Sync Setup Guide

This guide sets up cloud synchronization for your Whistler projects using Supabase (PostgreSQL database).

## What You Get

✅ Your projects sync across devices  
✅ Auto-backup of all data  
✅ Real-time collaboration ready  
✅ 500 MB free storage  
✅ No limits on users  

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click **Sign Up** and use your Discord or GitHub account
3. Click **New Project**
4. Fill in:
   - **Project Name:** `whistler`
   - **Database Password:** (create a strong one)
   - **Region:** Choose closest to you
5. Click **Create new project** (takes ~2 minutes)

## Step 2: Create Database Tables

Once your project is ready:

1. Go to **SQL Editor** in the left sidebar
2. Click **New Query**
3. Paste this SQL and click **Run**:

```sql
-- Users table (auto-created by Supabase Auth, we'll extend it)
create table if not exists user_profiles (
    id uuid references auth.users(id) on delete cascade primary key,
    discord_id text unique,
    discord_username text,
    created_at timestamp default now()
);

-- Projects table
create table if not exists projects (
    id text primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    created_at timestamp default now(),
    updated_at timestamp default now()
);

-- Files table
create table if not exists files (
    id text primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    project_id text references projects(id) on delete cascade,
    name text not null,
    url text not null,
    created_at timestamp default now(),
    updated_at timestamp default now()
);

-- Collections table
create table if not exists collections (
    id text primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    color text,
    created_at timestamp default now(),
    updated_at timestamp default now()
);

-- Timestamps table
create table if not exists timestamps (
    id text primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    collection_id text references collections(id) on delete cascade,
    file_id text references files(id) on delete cascade,
    start_time text,
    end_time text,
    note text,
    created_at timestamp default now(),
    updated_at timestamp default now()
);

-- Enable RLS (Row Level Security)
alter table user_profiles enable row level security;
alter table projects enable row level security;
alter table files enable row level security;
alter table collections enable row level security;
alter table timestamps enable row level security;

-- RLS Policies - Users can only see their own data
create policy "Users can view own profile" on user_profiles
    for select using (auth.uid() = id);

create policy "Users can view own projects" on projects
    for select using (auth.uid() = user_id);

create policy "Users can insert own projects" on projects
    for insert with check (auth.uid() = user_id);

create policy "Users can update own projects" on projects
    for update using (auth.uid() = user_id);

create policy "Users can delete own projects" on projects
    for delete using (auth.uid() = user_id);

create policy "Users can view own files" on files
    for select using (auth.uid() = user_id);

create policy "Users can insert own files" on files
    for insert with check (auth.uid() = user_id);

create policy "Users can update own files" on files
    for update using (auth.uid() = user_id);

create policy "Users can delete own files" on files
    for delete using (auth.uid() = user_id);

create policy "Users can view own collections" on collections
    for select using (auth.uid() = user_id);

create policy "Users can insert own collections" on collections
    for insert with check (auth.uid() = user_id);

create policy "Users can update own collections" on collections
    for update using (auth.uid() = user_id);

create policy "Users can delete own collections" on collections
    for delete using (auth.uid() = user_id);

create policy "Users can view own timestamps" on timestamps
    for select using (auth.uid() = user_id);

create policy "Users can insert own timestamps" on timestamps
    for insert with check (auth.uid() = user_id);

create policy "Users can update own timestamps" on timestamps
    for update using (auth.uid() = user_id);

create policy "Users can delete own timestamps" on timestamps
    for delete using (auth.uid() = user_id);
```

4. You should see "Success" messages for each command

## Step 3: Get Your Credentials

1. Go to **Settings** > **API**
2. Copy these:
   - **Project URL:** (starts with https://...)
   - **anon key:** (under "API keys")

## Step 4: Update Your Code

Update [script.js](script.js) with your Supabase URL and key:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

## Step 5: Deploy

```bash
git add .
git commit -m "Add Supabase cloud sync"
git push origin main
```

## How It Works

### Before (LocalStorage Only)
```
Data stored in browser → Lost if you clear cache or switch devices
```

### After (With Supabase)
```
Data stored in browser → Auto-save to cloud → Sync to other devices
```

### Real-Time Flow

1. **Sign in with Discord** → Creates a Supabase user session
2. **Create/Edit Project** → Auto-saved to Supabase
3. **Switch to another device** → Data syncs automatically
4. **No internet?** → Works offline, syncs when back online

## Data Sync Strategy

### Auto-Save When:
- Project created/updated
- File added/removed
- Collection created/modified
- Timestamp added/edited

### Pull from Cloud When:
- Page loads (load latest data)
- User manually refreshes (pull button - optional)
- Every 30 seconds (background sync)

## Security

✅ **Row Level Security (RLS):**
- Users can ONLY see their own data
- Even admins can't see other users' data
- Database enforces this at the row level

✅ **Authentication:**
- Must be logged in to access data
- Supabase validates your Discord auth

✅ **Encryption:**
- All data encrypted in transit (HTTPS)
- At-rest encryption with Supabase

## Monitoring Usage

1. Go to **SQL Editor**
2. Run: `SELECT COUNT(*) FROM projects;`
3. See your data stats anytime

## Troubleshooting

### "Table does not exist" error
- Make sure you ran the SQL queries above
- Check SQL Editor for any error messages

### "Invalid API key"
- Copy the **anon key**, not the service role key
- Keys are on Settings > API page

### Data not syncing
- Check browser console (F12) for errors
- Make sure you're logged in
- Verify Supabase URL and key are correct

### "You do not have permission" error
- RLS policy is blocking you
- You might not be authenticated
- Check that Discord login is working

## Useful Queries

Check your database size:
```sql
SELECT 
    sum(pg_total_relation_size(schemaname||'.'||tablename))::text AS size
FROM pg_tables 
WHERE schemaname = 'public';
```

See all your projects:
```sql
SELECT * FROM projects WHERE user_id = auth.uid();
```

## Next Steps

### Real-Time Updates
Add live sync so changes appear instantly on other tabs:
```javascript
supabase
    .from('projects')
    .on('*', payload => console.log(payload))
    .subscribe()
```

### Offline Support
Use Supabase + Service Worker for full offline capability

### Advanced Features
- Export data as JSON/CSV
- Share projects with other users
- Version history of changes

## Support

**Supabase Docs:** https://supabase.com/docs  
**GitHub Issues:** https://github.com/supabase/supabase  
**Discord Community:** https://discord.gg/supabase  

---

**Last Updated:** January 6, 2026
