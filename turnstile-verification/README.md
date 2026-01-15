# Turnstile Verification Worker

Cloudflare Worker dedicated to verifying Cloudflare Turnstile tokens for email signup.

## Setup

1. **Install dependencies:**
```bash
cd turnstile-verification
npm install
```

2. **Set up Turnstile Secret Key:**
```bash
npx wrangler secret put TURNSTILE_SECRET_KEY
# Paste your Turnstile Secret Key when prompted
```

3. **Deploy the worker:**
```bash
npm run deploy
```

## Environment Variables

- `TURNSTILE_SECRET_KEY` - Cloudflare Turnstile Secret Key (set as secret)

## Endpoint

### POST /api/verify-turnstile

Verifies a Turnstile token.

**Request Body:**
```json
{
  "token": "turnstile_token_here"
}
```

**Success Response (200):**
```json
{
  "success": true
}
```

**Error Response (400/403/500):**
```json
{
  "success": false,
  "error": "error message"
}
```

## Usage in Frontend

```javascript
const workerUrl = import.meta.env.VITE_TURNSTILE_WORKER_URL || 'https://turnstile-verification.fancy-sky-7888.workers.dev';
const response = await fetch(`${workerUrl}/api/verify-turnstile`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    token: turnstileToken,
  }),
});

const result = await response.json();
if (result.success) {
  // Proceed with signup
}
```
