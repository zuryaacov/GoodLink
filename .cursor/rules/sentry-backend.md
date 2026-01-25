# Sentry Backend (Cloudflare Workers) AI Rules

These examples should be used as guidance when configuring Sentry functionality within the Cloudflare Workers backend.

## Error / Exception Tracking

Use `Sentry.captureException(error)` to capture an exception and log the error in Sentry.
Use this in try catch blocks or areas where exceptions are expected.

```javascript
import * as Sentry from "@sentry/cloudflare";

try {
    // some operation
} catch (error) {
    Sentry.captureException(error);
    // handle error
}
```

## Verification Test

To verify Sentry is working, you can temporarily add this code:

```javascript
setTimeout(() => {
    throw new Error("Test Sentry Error");
}, 0);
```

## DSN Configuration

The backend uses this DSN:
```
https://e771f37fced759ffa221f6b97bdce745@o4510770008293376.ingest.us.sentry.io/4510770172985344
```

## Handler Wrapper

The Cloudflare Worker handler is wrapped with `Sentry.withSentry()`:

```javascript
import * as Sentry from "@sentry/cloudflare";

export default Sentry.withSentry(
    (env) => ({
        dsn: "https://e771f37fced759ffa221f6b97bdce745@o4510770008293376.ingest.us.sentry.io/4510770172985344",
        sendDefaultPii: true,
    }),
    {
        async fetch(request, env, ctx) {
            // handler code
        }
    }
);
```
