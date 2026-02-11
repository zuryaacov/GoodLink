# Error Messages Inventory

Centralized list of user-facing error messages across pages/wizards in the system.

## Auth

### `src/pages/AuthPage.jsx`

- `Security verification failed. Please try again.`
- `Full name must be at least 2 characters`
- `Full name cannot exceed 20 characters`
- `Please enter a valid email address (e.g. name@example.com)`
- `Password must be at least 8 characters long`
- `Password cannot exceed 15 characters`
- `Password must contain at least one uppercase letter (A-Z)`
- `Password must contain at least one lowercase letter (a-z)`
- `Password must contain at least one number`
- `Passwords do not match`
- `Registration failed. Please try again.`
- `Please complete the security verification`
- `Security verification failed. Please try again.`
- `Email configuration error. Please contact support or check your Supabase email settings.`
- `Check your email for the confirmation link! If you don't receive it, check your spam folder.`
- `Password reset link sent to your email.`

## Links

### `src/pages/dashboard/LinkBuilderPage.jsx`

- `User not authenticated`
- `Target URL is required`
- `Link name is required. Please enter a name for your link.`
- `A link with this name already exists. Please choose a different name.`
- `Error saving link. Please try again.`
- `Name already in use` (modal title)
- `Coming Soon` (modal title)
- `Analytics page is coming soon. Stay tuned!`

### `src/components/dashboard/NewLinkWizard.jsx`

- `User not authenticated`
- `Target URL is required`
- `Link name is required. Please enter a name for your link.`
- `A link with this name already exists. Please choose a different name.`
- `Error Creating Link` (modal title)
- `Unknown error occurred`

### `src/components/dashboard/LinkWizardOnePerPage.jsx`

- `Please enter a name for your link.`
- `You must be logged in.`
- `This name already exists in your links. Please use a different name.`
- `Error checking name.`
- `Please enter a destination URL.`
- `Redirect cannot be to glynk.to. Please use a different URL.`
- `This URL already exists in your links. Please use a different URL.`
- `URL safety check failed. This URL may be unsafe.`
- `Error checking URL.`
- `Please enter a slug.`
- `Invalid slug`
- `Error validating slug.`
- `Please enter a redirect URL for bots.`
- `Redirect cannot be to glynk.to.`
- `Invalid URL`
- `Please select a country`
- `A rule for this country already exists`
- `Please enter a URL`

### `src/components/dashboard/wizard/Step1FastTrack.jsx`

- `URL is required`
- `Invalid URL format`
- `Redirect cannot be to glynk.to. Please use a different URL.`

### `src/components/dashboard/wizard/Step3Security.jsx`

- `Please enter a redirect URL for bots`
- `Invalid URL format`
- `Redirect cannot be to glynk.to. Please use a different URL.`
- `Please select a country`
- `Please enter a URL`

### `src/lib/slugValidation.js`

- `Slug cannot be empty`
- `Slug must be at least 3 characters long`
- `Slug cannot exceed 30 characters`
- `Only English letters (a-z), numbers (0-9), and hyphens (-) are allowed.`
- `Slug cannot contain consecutive hyphens (--).`
- `Slug cannot start with a hyphen (-).`
- `Slug cannot end with a hyphen (-).`
- `This slug contains inappropriate content and cannot be used.`
- `This slug "<slug>" is already taken. Please choose a different slug.` (dynamic slug)
- `This slug "<slug>" is already taken for your domain "<domain>". Please choose a different slug.` (dynamic slug/domain)
- `Slug contains inappropriate content.`
- `Slug is not available.`
- `Database connection not available`
- `Error checking slug availability. Please try again.`
- _(Content-moderation technical messages — e.g. localhost skip, rate limit, CORS, API errors — are no longer shown to the user; fail-open without message.)_

### `src/lib/urlValidation.js`

- `URL cannot be empty`
- `URL cannot contain spaces`
- `URL contains invalid characters`
- `Invalid protocol: <protocol>. Only http and https are allowed.` (dynamic protocol)
- `Invalid domain`
- `Port number must be between 1 and 65535`
- `Localhost and private IP addresses are not allowed`
- `Redirect cannot point to glynk.to or goodlink.ai. Please use a different URL.` (bot redirect)
- `Redirect cannot be the same as your link destination. Please use a different URL.` (bot redirect)

### `src/pages/dashboard/LinkManager.jsx`

- `Failed to change link state (Active/Paused). Please try again.`
- `Error deleting link. Please try again.`

## CAPI / Pixels

### `src/lib/pixelValidation.js`

- `Friendly name is required`
- `Friendly name cannot exceed 100 characters`
- `Name is required`
- `Conversion Name is required`
- `Custom event name is required`
- `Api_Secret is required`
- `Client Secret is required`
- `Access Token is required`

### `src/pages/dashboard/PixelBuilderPage.jsx`

- `You must be logged in to save CAPI`
- `A CAPI profile with this name already exists.`
- `This Pixel ID already exists for this platform.`

### `src/components/dashboard/PixelModal.jsx`

- `You must be logged in to save CAPI`
- `A CAPI profile with this name already exists.`
- `This Pixel ID already exists for this platform.`
- `Error saving CAPI. Please try again.`

### `src/components/dashboard/PixelWizardOnePerPage.jsx`

- `Failed to save.`
- `Friendly name is required.`
- `Friendly name cannot exceed 100 characters.`
- `Invalid Pixel ID format for <platform>.` (dynamic platform)
- `Name is required.` (Taboola event field)
- `Conversion Name is required.` (Outbrain event field)
- `Custom event name is required.`

### `src/pages/dashboard/PixelManager.jsx`

- `Error deleting CAPI profile. Please try again.`
- `Error updating CAPI status. Please try again.`
- Delete confirm text includes irreversible warning.

## UTM Presets

### `src/components/dashboard/UtmPresetBuilder.jsx`

- `Preset name is required`
- `Preset name cannot exceed 100 characters`
- `<UTM field> cannot exceed 250 characters`
- `<UTM field>: <sanitization error>`
- `UTM <field>: <sanitization error>` (rendered label format)
- `User not authenticated`
- `A UTM preset with this name already exists. Please choose a different name.`
- `Failed to save preset. Please try again.`

### `src/pages/dashboard/UtmPresetBuilderPage.jsx`

- `User not authenticated`
- `Preset name contains invalid content`
- `Preset name is required`
- `Preset name cannot exceed 100 characters`
- `A UTM preset with this name already exists. Please choose a different name.`
- `UTM field contains invalid content`
- `UTM value cannot exceed 250 characters`

### `src/components/dashboard/UtmPresetWizardOnePerPage.jsx`

- `Failed to save.`
- `Preset name is required.`
- `Preset name cannot exceed 100 characters.`
- `Invalid preset name.`
- `<UTM step> cannot exceed 250 characters.`
- `Invalid <UTM step>.`

### `src/pages/dashboard/UtmPresetManager.jsx`

- `Failed to load UTM presets. Please try again.`
- `Failed to delete preset. Please try again.`
- Delete confirm text includes irreversible warning.

## Custom Domains

### `src/lib/domainValidation.js`

- `Domain must be a non-empty string`
- `Domain too long (max <maxLength> chars)` (dynamic maxLength)
- `Domain is empty after sanitization`
- `Localhost not allowed`
- `Invalid IPv4 address`
- `IP addresses not allowed`
- `Invalid characters in domain`
- `Non-ASCII characters require Punycode encoding`
- `Domain must have a TLD (e.g., .com)`
- `Empty label in domain`
- `Label "<label>" exceeds 63 characters` (dynamic label)
- `Label "<label>" cannot start/end with hyphen` (dynamic label)
- `Invalid label "<label>"` (dynamic label)
- `TLD cannot contain numbers`
- `TLD must be at least 2 characters`
- `Domain name cannot be empty`
- `Subdomains not allowed`
- `Domain does not resolve (no DNS records)`
- `DNS lookup failed: <err.message>` (dynamic)

### `src/pages/dashboard/CustomDomainsManager.jsx`

- `Error deleting domain. Please try again.`
- `Please wait while we verify your DNS configuration...`
- `Domain ID or Cloudflare hostname ID is required`
- `Failed to verify domain`
- `Verifying DNS Records` (modal title)
- `DNS Verified Successfully!`
- `Your domain <domain> has been verified and is now active.` (dynamic domain)
- `DNS Verification Pending` (modal title)
- `DNS records are still pending verification. Current status: <ssl_status>. Please wait a few minutes and try again.` (dynamic ssl_status)
- `Verification Failed` (modal title)
- `Error verifying DNS records. Please try again.`
- Delete confirm text includes irreversible warning.

### `src/pages/dashboard/AddDomainPage.jsx`

- `User not authenticated`
- `Failed to register domain with Cloudflare. Please try again.`
- `Invalid domain`
- `Root redirect cannot point to glynk.to or goodlink.ai.`
- `Root redirect cannot be the same as your custom domain.`
- `Domain ID or Cloudflare hostname ID is required`
- `Failed to verify domain`
- `Domain verification failed. Please check your DNS records.`
- Additional HTTP-derived errors from API responses are passed through.

### `src/components/dashboard/AddDomainModal.jsx`

- `User not authenticated`
- `Invalid domain`
- `Root redirect cannot point to glynk.to or goodlink.ai.`
- `Root redirect cannot be the same as your custom domain.`
- `Error registering domain. Please try again.`
- `Domain ID or Cloudflare hostname ID is required`
- `Failed to verify domain`
- `Error verifying domain. Please check your DNS records and try again.`
- `DNS records are still pending. <statusMessage>. Please wait a few minutes and try again.` (dynamic statusMessage)
- Additional HTTP-derived errors from API responses are passed through.

### `src/components/dashboard/DomainWizardOnePerPage.jsx`

- `Failed to register domain.`
- `Domain is required.`
- `Please enter a valid redirect URL first.`
- `Almost done — please complete the previous step and then continue.`

## Shared / Infra

### `src/App.jsx`

- `Configuration Required` (blocking config screen title)
- `Supabase credentials are missing. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your Vercel project settings.`

### `src/lib/urlSafetyCheck.js`

- `Worker responded with status <status>: <details>` (dynamic)
- `Safety check service not configured`
- `Invalid URL format`
- `Network error`

### `src/lib/inputSanitization.js`

- `Input contains potentially dangerous content and cannot be saved.`

### `src/lib/redisCache.js`

- `User not authenticated`

---

## Notes

- This file focuses on user-facing error messages (validation, save/update/delete failures, auth failures).
- Console-only technical logs are mostly excluded unless they surface to users via modal/error state.
- Dynamic messages are represented with placeholders like `<UTM field>`, `<platform>`, `<status>`.
