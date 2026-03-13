# GoodLink User Guide

## Quick Start

1. Go to `/login` and sign in or create an account.
2. Open `/dashboard/links`.
3. Click `New Link` and complete the Link Wizard.
4. Copy your short link and monitor results in `/dashboard/analytics`.

## Public Pages

- `/` - Homepage
- `/login` - Sign in, sign up, password reset
- `/contact` - Contact form
- `/abuse` - Abuse and DMCA reporting
- `/terms` - Terms of Service
- `/privacy` - Privacy Policy
- `/subprocessors` - Subprocessors list
- `/dpa` - DPA page

## Dashboard Pages

- `/dashboard` - Analytics overview
- `/dashboard/links` - Link Manager
- `/dashboard/utm-presets` - UTM Preset Manager
- `/dashboard/pixels` - CAPI Manager
- `/dashboard/domains` - Custom Domains
- `/dashboard/settings` - Account Settings
- `/dashboard/admin` - Admin Panel (admins only)

## Link Wizard

Main steps:

1. Name
2. Target URL
3. Domain (Advanced/Pro)
4. Slug
5. Bot Protection (Advanced/Pro)
6. Geo Targeting (Pro)
7. CAPI Select (Pro)
8. Final Review and Save

## UTM Preset Wizard

Steps:

1. Name
2. Platform
3. Source
4. Medium
5. Campaign
6. Content
7. Term

The wizard offers platform-specific values and a live query-string preview.

## CAPI Wizard

Steps:

1. Name
2. Platform
3. Pixel ID
4. CAPI Token
5. Event Type

Validation rules are platform-specific (Meta, TikTok, Google, and more).

## Domain Wizard

Steps:

1. Domain
2. Root Redirect (optional)
3. DNS Setup
4. Verify

If verification does not pass immediately, wait for DNS propagation and retry.

## Best Practices

- Use a consistent naming convention.
- Reuse UTM presets instead of manual typing.
- Connect CAPI for high-value campaigns.
- Review analytics regularly and optimize weak traffic sources.

