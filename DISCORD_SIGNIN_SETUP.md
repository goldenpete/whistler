# Discord Sign-In Setup Guide for GitHub Pages

This guide walks you through setting up Discord OAuth for your Whistler application on GitHub Pages.

## Overview

The Discord Sign-In system has been integrated with the following features:

- **Discord Sign-In Icon** in the top-right corner (when not logged in)
- **OAuth 2.0 Flow** with Discord authentication
- **User Profile Menu** showing Discord username, discriminator, and logout option
- **Serverless Backend** needed for OAuth token exchange (GitHub Pages is static)
- **LocalStorage** - User session persists across browser refreshes

## Why Serverless is Needed

Discord's OAuth requires a secure backend to:
1. Exchange authorization code for access token
2. Fetch user information from Discord API
3. Return user data to your frontend

GitHub Pages is static-only, so we use a serverless function (Vercel, Netlify, etc.).

## Step-by-Step Setup

### 1. Create a Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application**
3. Give it a name (e.g., "Whistler App")
4. Accept terms and click **Create**
5. Go to **OAuth2 > General** tab
6. Copy your **Client ID**
7. Under **Client Secret**, click **Reset** and copy the secret

### 2. Set Up Your Redirect URI

1. In the Discord Developer Portal, go to **OAuth2 > General**
2. Under **Redirects**, click **Add Redirect**
3. Add your GitHub Pages redirect URI:
   - If your site is at root: `https://YOUR_USERNAME.github.io/whistler`
   - Or your custom domain: `https://yourdomain.com/whistler`
4. **Save Changes**

### 3. Deploy a Serverless Function

You need to deploy a backend function to handle OAuth token exchange. Choose one:

#### **Option A: Vercel (Recommended)**

1. Create a GitHub repository (if you don't have one)
2. Go to [Vercel.com](https://vercel.com)
3. Click **New Project** and import your repository
4. Create a file: `api/discord-auth.js`

```javascript
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { code } = req.body;
    
    if (!code) {
        return res.status(400).json({ error: 'Missing authorization code' });
    }

    try {
        // Exchange code for token
        const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.DISCORD_CLIENT_ID,
                client_secret: process.env.DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: process.env.DISCORD_REDIRECT_URI
            })
        });

        const tokenData = await tokenResponse.json();
        
        if (!tokenData.access_token) {
            return res.status(400).json({ error: 'Failed to get access token' });
        }

        // Get user data
        const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });

        const user = await userResponse.json();

        return res.status(200).json({
            user: {
                id: user.id,
                username: user.username,
                discriminator: user.discriminator,
                email: user.email,
                avatar: user.avatar
            }
        });
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(500).json({ error: 'Authentication failed' });
    }
}
```

5. Add environment variables in Vercel dashboard:
   - `DISCORD_CLIENT_ID`: Your Client ID
   - `DISCORD_CLIENT_SECRET`: Your Client Secret
   - `DISCORD_REDIRECT_URI`: Your redirect URI (e.g., `https://YOUR_USERNAME.github.io/whistler`)

6. Deploy! Vercel gives you a URL like: `https://your-project.vercel.app`

#### **Option B: Netlify Functions**

1. Create `netlify/functions/discord-auth.js`:

```javascript
export const handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method not allowed' };
    }

    const { code } = JSON.parse(event.body);
    
    try {
        const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.DISCORD_CLIENT_ID,
                client_secret: process.env.DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: process.env.DISCORD_REDIRECT_URI
            })
        });

        const tokenData = await tokenResponse.json();
        
        const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });

        const user = await userResponse.json();

        return {
            statusCode: 200,
            body: JSON.stringify({
                user: {
                    id: user.id,
                    username: user.username,
                    discriminator: user.discriminator,
                    email: user.email,
                    avatar: user.avatar
                }
            })
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Auth failed' }) };
    }
};
```

2. Add environment variables in Netlify dashboard

#### **Option C: Replit (Quick & Easy)**

1. Go to [Replit.com](https://replit.com)
2. Click **Create Repl** > choose **Node.js**
3. Create `index.js`:

```javascript
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

app.post('/api/discord-auth', async (req, res) => {
    const { code } = req.body;
    
    try {
        const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.DISCORD_CLIENT_ID,
                client_secret: process.env.DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: process.env.DISCORD_REDIRECT_URI
            })
        });

        const tokenData = await tokenResponse.json();
        
        const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });

        const user = await userResponse.json();

        res.json({
            user: {
                id: user.id,
                username: user.username,
                discriminator: user.discriminator,
                email: user.email,
                avatar: user.avatar
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Auth failed' });
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

4. In Replit Secrets, add:
   - `DISCORD_CLIENT_ID`
   - `DISCORD_CLIENT_SECRET`
   - `DISCORD_REDIRECT_URI`

5. Click **Run** and get your Replit URL (like `https://your-replit.replit.dev`)

### 4. Update Your Code

Update `script.js` with your values:

```javascript
const Auth = {
    CLIENT_ID: 'YOUR_ACTUAL_DISCORD_CLIENT_ID',
    REDIRECT_URI: 'https://YOUR_USERNAME.github.io/whistler',
    TOKEN_EXCHANGE_URL: 'https://your-serverless-function.vercel.app/api/discord-auth',
    // ... rest of code
};
```

### 5. Deploy to GitHub Pages

1. Commit and push:
```bash
git add .
git commit -m "Add Discord Sign-In"
git push origin main
```

2. Visit your GitHub Pages site
3. Click the Discord icon and test sign-in!

## How It Works

### User Flow

1. **Click Discord Icon** - User is redirected to Discord OAuth screen
2. **Authorize App** - User approves access to username and email
3. **Discord Redirects Back** - User is sent back with `?code=XXX` parameter
4. **Backend Exchanges Code** - Serverless function trades code for access token
5. **Get User Info** - Backend fetches user profile from Discord API
6. **Store Locally** - User data saved to localStorage
7. **Show Avatar** - Discord profile picture appears in top-right

### Data Flow Diagram

```
User Browser                    Your Site                  Serverless Function             Discord API
    |                              |                              |                             |
    |------ Click Icon ------------>|                              |                             |
    |                              |-- Redirect to Discord ------->|                             |
    |<---------- Authorize -------------------- (User logs in at Discord)
    |                              |<-- Redirect back w/ code --------|                         |
    |                              |-- POST code ------------------>|                          |
    |                              |                              |-- Exchange for token ------>|
    |                              |                              |<-- Return token ------------|
    |                              |                              |-- Get user info ------------>|
    |                              |<-- Return user data ---------|<-- Return user data -------|
    |                              |                              |                             |
    |<------ Store in localStorage -----                          |                             |
    |------ Show profile pic ------->|                              |                             |
```

## Configuration Checklist

- [ ] Discord Application created
- [ ] Client ID copied
- [ ] Client Secret copied
- [ ] Redirect URI added to Discord Developer Portal
- [ ] Serverless function deployed (Vercel/Netlify/Replit)
- [ ] Environment variables set on serverless platform
- [ ] `script.js` updated with Client ID, Redirect URI, and Token Exchange URL
- [ ] Site pushed to GitHub Pages
- [ ] Discord sign-in tested

## Troubleshooting

### "Invalid OAuth2 code" error
- Make sure code is valid (it expires quickly)
- Check your `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`
- Verify redirect URI matches exactly

### Stuck on "Signing in..."
- Check browser console for network errors (F12)
- Verify serverless function is running
- Check if `TOKEN_EXCHANGE_URL` is correct
- Make sure serverless function has correct environment variables

### Redirect URI mismatch error
- Check that your redirect URI in Discord Developer Portal matches exactly what's in `script.js`
- Include the full path (e.g., `/whistler`)
- Use HTTPS only

### "Can't load user avatar"
- Discord avatar IDs are part of the CDN URL
- If avatar is null, Discord hasn't set one
- Add a fallback avatar image

## Security Best Practices

✅ **Do:**
- Keep `DISCORD_CLIENT_SECRET` secret (only on backend, never in frontend code)
- Use environment variables for sensitive data
- Always validate tokens on the backend
- Use HTTPS only

❌ **Don't:**
- Expose `CLIENT_SECRET` in client-side code
- Trust unvalidated tokens
- Store access tokens in localStorage for long-term use
- Log sensitive data

## Environment Variables Explained

- `DISCORD_CLIENT_ID`: Your app's public ID (safe to share)
- `DISCORD_CLIENT_SECRET`: Your app's secret key (keep private!)
- `DISCORD_REDIRECT_URI`: Where Discord sends users back after auth

## Useful Links

- [Discord Developer Portal](https://discord.com/developers/applications)
- [Discord OAuth Documentation](https://discord.com/developers/docs/topics/oauth2)
- [Vercel Functions](https://vercel.com/docs/functions/serverless-functions)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)
- [Replit Docs](https://replit.com/site/docs)

## Next Steps

### Add More Features
- Store user profile data on your backend
- Sync user preferences across devices
- Show Discord username in the app
- Fetch Discord server/guild list

### Connect to Discord Bot
- Make your app a Discord bot
- Send messages to Discord from your app
- Update status based on activity

## Support

If you encounter issues:
1. Check browser console (F12 > Console tab)
2. Check serverless function logs
3. Verify all credentials are correct
4. Try in an incognito window (rules out cache issues)
5. Check Discord Developer Portal for any error messages

---

**Last Updated**: January 6, 2026
**Version**: 1.0
