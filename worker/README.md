# Whistler Sync Worker

Anonymous 16-digit login + cloud sync using Cloudflare Workers + D1.

## Features

- **Anonymous Authentication**: 16-digit account IDs, no email or password required
- **Cloud Sync**: Sync Whistler data across devices
- **Secure Tokens**: JWT-like session tokens with 24-hour expiry
- **Stateless**: All data stored in Cloudflare D1 SQLite database
- **Rate Limiting**: Strict per-IP rate limits to prevent abuse
- **Captcha Protection**: Cloudflare Turnstile to prevent automated attacks

## Deployment Instructions

### Prerequisites

1. [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier is sufficient)
2. [Node.js](https://nodejs.org/) installed (v18+)
3. [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) installed

### Step 1: Install Dependencies

```bash
cd worker
npm install
```

### Step 2: Login to Cloudflare

```bash
npx wrangler login
```

This will open a browser window to authenticate with your Cloudflare account.

### Step 3: Create the D1 Database

```bash
npx wrangler d1 create whistler-sync-db
```

**IMPORTANT**: Copy the `database_id` from the output. It will look like:
```
[[d1_databases]]
binding = "DB"
database_name = "whistler-sync-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### Step 4: Create Turnstile Widget

1. Go to [Cloudflare Dashboard → Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile)
2. Click "Add Widget"
3. Enter a name (e.g., "Whistler Sync")
4. Add your domain (e.g., `whistlerbox.com`)
5. Choose "Managed" mode
6. Click "Create"
7. **Copy the Site Key** (for frontend) and **Secret Key** (for worker)

### Step 5: Update wrangler.toml

Edit `wrangler.toml` and configure:

```toml
[[d1_databases]]
binding = "DB"
database_name = "whistler-sync-db"
database_id = "YOUR_ACTUAL_DATABASE_ID"

[vars]
JWT_SECRET = "your-secure-random-string-here"
TURNSTILE_SECRET = "your-turnstile-secret-key"
```

Generate a JWT secret with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 6: Initialize the Database

```bash
npx wrangler d1 execute whistler-sync-db --remote --file=./schema.sql
```

### Step 7: Deploy the Worker

```bash
npx wrangler deploy
```

The output will show your worker URL:
```
Published whistler-sync (1.00 sec)
  https://whistler-sync.YOUR_SUBDOMAIN.workers.dev
```

### Step 7: Update the Frontend

Edit `whistler.js` and find the `SyncManager` class. Update the `API_URL`:

```javascript
// Configuration - UPDATE THIS after deploying your worker!
this.API_URL = 'https://whistler-sync.YOUR_SUBDOMAIN.workers.dev';
```

## Local Development

To test locally before deploying:

```bash
# Initialize local database
npx wrangler d1 execute whistler-sync-db --local --file=./schema.sql

# Start local dev server
npx wrangler dev
```

The local server will be available at `http://localhost:8787`.

## API Endpoints

### POST /login
Authenticate or create account.

**Request:**
```json
{
  "account_id": "1234567890123456"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJ...",
  "account_id": "1234567890123456",
  "is_new": false
}
```

### GET /data
Get all data for authenticated account.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    { "key": "whistler_data", "value": "...", "updated_at": "..." }
  ]
}
```

### PUT /data
Upsert a key-value pair.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "key": "whistler_data",
  "value": { ... }
}
```

### DELETE /data
Delete a key-value pair.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "key": "whistler_data"
}
```

### GET /health
Health check endpoint.

## Security Notes

- Account IDs are cryptographically random 16-digit numbers
- Session tokens expire after 24 hours
- All data is scoped to the authenticated account
- No personal information is collected
- No analytics or tracking

## Troubleshooting

### CORS Errors
The worker includes CORS headers for all origins. If you're hosting the frontend on a specific domain, you can restrict the `Access-Control-Allow-Origin` header in `src/index.js`.

### Token Expired
If you see 401 errors, the token may have expired. The frontend will automatically attempt to re-login.

### Database Errors
If you get database errors, ensure the schema was applied:
```bash
npx wrangler d1 execute whistler-sync-db --file=./schema.sql
```
