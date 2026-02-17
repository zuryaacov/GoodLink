# Wizard Steps Inventory

## New Link Wizard
**Source:** `src/components/dashboard/LinkWizardOnePerPage.jsx`

| Step | Title | Subtitle |
|------|-------|----------|
| 1 | Name your Link | What should we call your link? |
| 2 | Target URL | Where should the user land? |
| 3 | Select Domain | Choose the base for your short link. |
| 4 | Custom Slug | Make it memorable. |
| 5 | Bot Protection | How should we handle bots? |
| 6 | Geo Targeting | Optional routing by country. |
| 7 | CAPI Select | Select Conversions API to fire events. |
| 8 | Final Launch | Final review of your GoodLink. |

## UTM Preset Wizard
**Source:** `src/components/dashboard/UtmPresetWizardOnePerPage.jsx`

| Step | Title | Subtitle |
|------|-------|----------|
| 1 | Name your Preset | What should we call your UTM preset? |
| 2 | Select Company | Which ad platform is this preset for? |
| 3 | Select Source | Where the traffic comes from. |
| 4 | Select Medium | Marketing medium (e.g. cpc, email). |
| 5 | Select Campaign | Campaign name or dynamic value. |
| 6 | Select Content | Ad content or variation. |
| 7 | Select Term | Paid search keyword or term. |

## Pixel / CAPI Wizard
**Source:** `src/components/dashboard/PixelWizardOnePerPage.jsx`

| Step | Title | Subtitle |
|------|-------|----------|
| 1 | Name your CAPI | A friendly name for this CAPI profile. |
| 2 | Select Company | Which ad platform is this CAPI profile for? |
| 3 | Enter Pixel ID | The pixel or measurement ID from your ad platform. |
| 4 | CAPI Token | Your token so we can send CAPI events. |
| 5 | Event Type | The conversion event to send. |

## Domain Wizard (Full Page)
**Source:** `src/components/dashboard/DomainWizardOnePerPage.jsx`

| Step | Title | Subtitle |
|------|-------|----------|
| 1 | Enter your Domain | Your custom domain (e.g. mybrand.com). |
| 2 | Root Redirect | Optional. Where to send visitors who open the domain without a slug. |
| 3 | DNS Setup | Add these records at your domain registrar. |
| 4 | Verify Configuration | Confirm DNS is set up correctly. May take a few minutes after adding records. |

## Add Domain Modal
**Source:** `src/components/dashboard/AddDomainModal.jsx`

| Step | Title | Subtitle |
|------|-------|----------|
| 1 | Domain | Enter your domain |
| 2 | DNS Setup | Configure DNS records |
| 3 | Verify | Verify configuration |
