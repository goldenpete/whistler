# Google Sign-In Setup Guide for GitHub Pages

This guide walks you through setting up Google Sign-In for your Whistler application on GitHub Pages.

## Overview

The Google Sign-In system has been integrated into your app with the following features:

- **Sign-In Icon** in the top-right corner (when not logged in)
- **Google OAuth** authentication via Google Sign-In library
- **User Profile Menu** showing user info and logout option (when logged in)
- **Client-side Authentication** - No backend server needed for GitHub Pages
- **LocalStorage** - User session persists across browser refreshes

## Step-by-Step Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top and select "New Project"
3. Enter a project name (e.g., "Whistler App")
4. Click "Create"

### 2. Enable the Google+ API

1. In the Cloud Console, go to **APIs & Services > Library**
2. Search for "Google+ API"
3. Click on it and press **Enable**

### 3. Create OAuth 2.0 Credentials

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. If prompted, configure the OAuth consent screen:
   - User Type: **External**
   - Fill in app name, user support email, and developer contact
   - Add scopes: Select `email` and `profile`
   - Add test users (your email)
   - Save and continue
4. Return to Credentials and click **Create Credentials > OAuth client ID** again
5. Application type: **Web application**
6. Under "Authorized JavaScript origins", add:
   - `https://localhost:3000` (for local testing)
   - `https://YOUR_GITHUB_USERNAME.github.io` (your GitHub Pages domain)
   - `https://YOUR_GITHUB_USERNAME.github.io/whistler` (if in a subdirectory)
7. Click **Create**
8. Copy your **Client ID** from the popup

### 4. Add Your Client ID to the Code

1. Open `script.js` in your editor
2. Find the `Auth` object (near the top after comments)
3. Replace `'YOUR_GOOGLE_CLIENT_ID_HERE'` with your actual Client ID:

```javascript
const Auth = {
    CLIENT_ID: 'YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com',
    // ... rest of code
};
```

### 5. Test Locally (Optional)

If you want to test on your local machine:

1. Start a simple HTTP server:
   ```bash
   # Using Python 3
   python -m http.server 3000
   
   # Using Node.js
   npx http-server -p 3000
   ```

2. Visit `http://localhost:3000` in your browser
3. Click the sign-in icon and test Google Sign-In

### 6. Deploy to GitHub Pages

1. Commit and push your changes:
   ```bash
   git add .
   git commit -m "Add Google Sign-In authentication"
   git push origin main
   ```

2. Visit your GitHub Pages site: `https://YOUR_USERNAME.github.io/whistler`
3. The sign-in button should work!

## How It Works

### Architecture

- **Google OAuth Library**: Handles secure authentication with Google
- **JWT Token Decoding**: User data is extracted from Google's JWT token
- **LocalStorage**: User session is stored locally in the browser
- **No Backend Required**: Everything runs client-side, perfect for GitHub Pages

### User Flow

1. **Not Logged In**: User sees a sign-in icon (📥) in the top-right corner
2. **Click Icon**: Modal opens with Google Sign-In button
3. **Sign In with Google**: Google handles authentication securely
4. **After Sign-In**: 
   - User's name, email, and avatar are stored locally
   - Profile icon (user avatar) appears in top-right
   - User data persists across browser sessions
5. **Click Avatar**: Profile menu appears with logout option
6. **Logout**: User session is cleared, session returns to "not logged in" state

## Security Considerations

### What's Secure
- ✅ Google handles password security
- ✅ JWT token validation is done by Google
- ✅ HTTPS-only on production (GitHub Pages enforces this)
- ✅ Client-side storage only (no sensitive data transmitted)

### What's Not Backend-Specific
- ⚠️ Since this is client-side only, tokens expire after ~1 hour
- ⚠️ User data is stored in browser's localStorage (local to that device)
- ⚠️ No server-side token refresh (user might need to re-sign in)
- ⚠️ No user database (add backend if you need persistence across devices)

### Best Practices

1. **Never log sensitive data**: User tokens should never appear in console
2. **HTTPS Only**: Always use HTTPS in production
3. **Validate on Backend**: If you add a backend, always validate tokens server-side
4. **Regular Testing**: Test sign-in after updating your GitHub Pages domain

## Customization

### Change Button Style

Edit the button styling in `style.css`:

```css
.auth-btn {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    /* Customize colors, size, etc. */
}
```

### Add More User Data

In `Auth.handleGoogleSignIn()`, you can access more data from `userData`:

```javascript
const userData = JSON.parse(jsonPayload);
// Available fields: sub, name, email, picture, email_verified, aud, iss, iat, exp
```

### Customize User Profile Menu

Edit `Auth.showUserProfile()` to add more options or styling.

## Troubleshooting

### "Google is not defined"
- Make sure the Google Sign-In library is loaded: `<script src="https://accounts.google.com/gsi/client" async defer></script>`
- Check browser console for network errors

### Sign-In button doesn't appear
- Verify your Client ID is correct
- Check that your domain is in the authorized origins
- Wait 5-10 minutes after adding the domain (Google may need time to propagate)

### "Unauthorized origin" error
- Add your GitHub Pages URL to authorized origins in Google Cloud Console
- Format: `https://YOUR_USERNAME.github.io/whistler`

### Session lost after page refresh
- Check that localStorage is enabled in your browser
- Try in an incognito window (some browsers restrict localStorage in private mode)

## Next Steps

### Add Backend (Optional)

If you want persistent user data across devices, add a backend:

1. Use Firebase, Supabase, or your own server
2. On sign-in, send the JWT token to your backend
3. Validate the token and create a user record
4. Return a session token to store in localStorage

### Example Firebase Integration
```javascript
// After successful Google sign-in
firebase.auth().signInWithCredential(credential);
```

### Add User-Specific Data Storage

Once you have backend setup:
- Store user preferences
- Sync projects across devices
- Cloud backup of timestamps and notes

## Useful Links

- [Google Sign-In Documentation](https://developers.google.com/identity/gsi/web)
- [Google Cloud Console](https://console.cloud.google.com/)
- [OAuth 2.0 Overview](https://developers.google.com/identity/protocols/oauth2)
- [GitHub Pages Documentation](https://pages.github.com/)

## Questions?

If you encounter issues:

1. Check your Client ID is correct
2. Verify domain is in authorized origins
3. Check browser console (F12) for error messages
4. Test in an incognito window (rules out localStorage issues)
5. Clear browser cache and reload

---

**Last Updated**: January 6, 2026
**Version**: 1.0
