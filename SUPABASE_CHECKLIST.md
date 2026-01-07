# Supabase Setup Checklist

Follow these steps to enable cloud sync:

## 1. Create Supabase Project ✓
- [ ] Go to https://supabase.com
- [ ] Click "Sign Up" (use Discord or GitHub)
- [ ] Create new project named "whistler"
- [ ] Wait for project to initialize (~2 minutes)

## 2. Create Database Schema ✓
- [ ] Go to **SQL Editor** in Supabase dashboard
- [ ] Click **New Query**
- [ ] Copy all SQL from [SUPABASE_SETUP.md](SUPABASE_SETUP.md#step-2-create-database-tables)
- [ ] Paste and click **Run**
- [ ] Verify all queries succeeded (green checkmarks)

## 3. Get Your Credentials ✓
- [ ] Go to **Settings** > **API**
- [ ] Copy **Project URL** (starts with `https://`)
- [ ] Copy **anon key** (under "API keys")

## 4. Update Your Code ✓
Open [supabase-sync.js](supabase-sync.js#L8-L9) and replace:

```javascript
// Line 8-9: Add your Supabase credentials
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

With your actual values from Supabase.

## 5. Deploy ✓
```bash
git add .
git commit -m "Add Supabase cloud sync"
git push origin main
```

## 6. Test ✓
1. Visit https://goldenpete.github.io/whistler/
2. Sign in with Discord
3. Create a project
4. Go to Supabase dashboard > **Table Editor**
5. Click **projects** table
6. **You should see your project in the cloud!** 🎉

## Verify It's Working

Check Supabase dashboard:
1. Go to **Table Editor**
2. Click **projects** - should see your projects
3. Click **files** - should see your files
4. Click **timestamps** - should see your timestamps

## Troubleshooting

### Projects not appearing in Supabase?
- Check browser console (F12) for errors
- Make sure you're logged in with Discord
- Verify Supabase URL and key are correct
- Check that SQL queries ran successfully

### "Table does not exist" error?
- Make sure you ran ALL the SQL from SUPABASE_SETUP.md
- Check SQL Editor for error messages
- Try running the SQL again

### "You do not have permission" error?
- RLS policy might be blocking you
- Make sure you're authenticated with Discord
- Check Supabase Dashboard > Authentication > Users

## Next Steps

Your data now syncs across devices! 

To manually sync anytime:
```javascript
// In browser console
CloudSync.pullData() // Download latest from cloud
CloudSync.pushData() // Upload changes to cloud
```

---

Once you complete steps 1-5, your Whistler app will:
✅ Save all projects to the cloud  
✅ Sync across devices  
✅ Never lose data  
✅ Work offline (syncs when back online)
