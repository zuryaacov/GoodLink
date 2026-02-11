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

## Links

### `src/pages/dashboard/LinkBuilderPage.jsx`

- `User not authenticated`
- `Target URL is required`
- `Link name is required. Please enter a name for your link.`
- `A link with this name already exists. Please choose a different name.`
- `Error saving link. Please try again.`

### `src/components/dashboard/NewLinkWizard.jsx`

- `User not authenticated`
- `Target URL is required`
- `Link name is required. Please enter a name for your link.`
- `A link with this name already exists. Please choose a different name.`

### `src/pages/dashboard/LinkManager.jsx`

- `Failed to change link state (Active/Paused). Please try again.`

## CAPI / Pixels

### `src/lib/pixelValidation.js`

- `Friendly name is required`
- `Friendly name cannot exceed 100 characters`
- `Name is required`
- `Conversion Name is required`
- `Custom event name is required`

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
- `Invalid token format.`
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
- `<UTM step> cannot exceed 250 characters.`
- `Invalid <UTM step>.`

### `src/pages/dashboard/UtmPresetManager.jsx`

- `Failed to load UTM presets. Please try again.`
- `Failed to delete preset. Please try again.`
- Delete confirm text includes irreversible warning.

## Custom Domains

### `src/pages/dashboard/CustomDomainsManager.jsx`

- `Error deleting domain. Please try again.`
- `Please wait while we verify your DNS configuration...`
- `Domain ID or Cloudflare hostname ID is required`
- `Failed to verify domain`
- Delete confirm text includes irreversible warning.

### `src/pages/dashboard/AddDomainPage.jsx`

- `User not authenticated`
- `Failed to register domain with Cloudflare. Please try again.`
- `Domain ID or Cloudflare hostname ID is required`
- `Failed to verify domain`
- Additional HTTP-derived errors from API responses are passed through.

### `src/components/dashboard/AddDomainModal.jsx`

- `User not authenticated`
- `Domain ID or Cloudflare hostname ID is required`
- `Failed to verify domain`
- Additional HTTP-derived errors from API responses are passed through.

### `src/components/dashboard/DomainWizardOnePerPage.jsx`

- `Failed to register domain.`
- `Domain is required.`
- `Please enter a valid redirect URL first.`
- `Almost done — please complete the previous step and then continue.`

## Shared / Infra

### `src/lib/urlSafetyCheck.js`

- `Worker responded with status <status>: <details>` (dynamic)

### `src/lib/redisCache.js`

- `User not authenticated`

---

## Notes

- This file focuses on user-facing error messages (validation, save/update/delete failures, auth failures).
- Console-only technical logs are mostly excluded unless they surface to users via modal/error state.
- Dynamic messages are represented with placeholders like `<UTM field>`, `<platform>`, `<status>`.
