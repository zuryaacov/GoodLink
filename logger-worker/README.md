# Logger Worker

Cloudflare Worker for handling click tracking and analytics logging.

## Setup

1. Install dependencies:
```bash
cd logger-worker
npm install
```

2. Configure environment variables in Cloudflare Dashboard:
   - Go to Workers & Pages → logger-worker → Settings → Variables
   - Add required secrets (SUPABASE_URL, SUPABASE_KEY, etc.)

## Development

```bash
npm run dev
```

## Deploy

```bash
npm run deploy
```

## Endpoints

### Health Check
- **GET** `/` or `/health`
- Returns worker status

### Log Click
- **POST** `/api/log-click`
- Body:
```json
{
  "linkId": "uuid",
  "domain": "glynk.to",
  "slug": "example",
  "clickData": {
    "ip": "...",
    "userAgent": "...",
    "referrer": "...",
    "country": "..."
  }
}
```
