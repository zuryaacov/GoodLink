# Test Cloudflare Worker with Command Prompt (CMD)

Here's how to test your worker using Windows Command Prompt (CMD):

## Method 1: Using curl (If curl is installed)

Open Command Prompt (cmd.exe) and run:

```cmd
curl -X POST https://url-safety-check.fancy-sky-7888.workers.dev -H "Content-Type: application/json" -d "{\"url\": \"https://example.com\"}"
```

Replace `fancy-sky-7888` with your actual subdomain.

**Expected Response:**
```json
{"isSafe":true,"threatType":null}
```

## Method 2: Using PowerShell from CMD

If curl is not available, you can call PowerShell from CMD:

```cmd
powershell -Command "$body = @{url = 'https://example.com'} | ConvertTo-Json; Invoke-WebRequest -Uri 'https://url-safety-check.fancy-sky-7888.workers.dev' -Method POST -Body $body -ContentType 'application/json' | Select-Object -ExpandProperty Content"
```

This runs PowerShell commands from within CMD.

## Method 3: Simple PowerShell Command (Easier)

```cmd
powershell -Command "Invoke-WebRequest -Uri 'https://url-safety-check.fancy-sky-7888.workers.dev' -Method POST -Body '{\"url\":\"https://example.com\"}' -ContentType 'application/json' | Select-Object -ExpandProperty Content"
```

## Method 4: Check if curl is installed

First, check if curl is available:

```cmd
curl --version
```

If you see a version number, curl is installed. If not, you'll need to use PowerShell commands instead.

## Method 5: Install curl (Optional)

If you want to use curl but don't have it:

1. Download curl for Windows from: https://curl.se/windows/
2. Or use Chocolatey: `choco install curl`
3. Or use Windows 10/11 built-in curl (should be available by default)

## Quick Test Script for CMD

Create a file `test-worker.cmd` with this content:

```cmd
@echo off
echo Testing Cloudflare Worker...
echo.
powershell -Command "$body = @{url = 'https://example.com'} | ConvertTo-Json; $response = Invoke-WebRequest -Uri 'https://url-safety-check.fancy-sky-7888.workers.dev' -Method POST -Body $body -ContentType 'application/json'; Write-Host $response.Content"
pause
```

Replace `fancy-sky-7888` with your actual subdomain, then run:
```cmd
test-worker.cmd
```

## Expected Responses

### ✅ Successful Response:
```json
{"isSafe":true,"threatType":null}
```

### ❌ Error (Missing API Key):
```json
{"isSafe":true,"threatType":null,"error":"Safety check service not configured"}
```

### ❌ Error (Wrong Method):
```json
{"error":"Method not allowed. Use POST."}
```

## Step-by-Step Test

1. **Open Command Prompt:**
   - Press `Win + R`
   - Type `cmd`
   - Press Enter

2. **Test with curl (if available):**
   ```cmd
   curl -X POST https://url-safety-check.fancy-sky-7888.workers.dev -H "Content-Type: application/json" -d "{\"url\": \"https://example.com\"}"
   ```

3. **Or test with PowerShell from CMD:**
   ```cmd
   powershell -Command "$body = @{url = 'https://example.com'} | ConvertTo-Json; Invoke-WebRequest -Uri 'https://url-safety-check.fancy-sky-7888.workers.dev' -Method POST -Body $body -ContentType 'application/json' | Select-Object -ExpandProperty Content"
   ```

4. **Check the response:**
   - Should see JSON with `{"isSafe":true,"threatType":null}`
   - If you see an error about API key, you need to add it in Cloudflare Dashboard

## Troubleshooting

### "curl is not recognized"
- Use Method 2 or 3 (PowerShell from CMD)
- Or install curl (Method 5)

### "Invoke-WebRequest" errors
- Make sure you're using the correct syntax
- Check that your worker URL is correct
- Verify the worker is deployed

### Getting errors about API key
- Go to Cloudflare Dashboard → Your Worker → Settings → Variables and Secrets
- Add `GOOGLE_SAFE_BROWSING_API_KEY` with value: `AIzaSyC115jFfH72O_zbZ1Z0ac_QfzhJurSzXLU`
- Redeploy the worker

## Get Your Worker URL

1. Go to Cloudflare Dashboard
2. Workers & Pages → Click on `url-safety-check`
3. Copy the URL shown at the top
4. Replace `fancy-sky-7888` in the commands above with your actual subdomain

