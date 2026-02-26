# Admin Roles – Setup

## 1. Run SQL in Supabase

In **Supabase Dashboard → SQL Editor**, run the migration:

- **File:** `supabase/migrations/add_admin_role.sql`

Or paste and run:

```sql
-- Add role column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin'));

-- Admins can delete any link
CREATE POLICY "Admins can delete any link"
  ON public.links
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE role = 'admin'
    )
  );
```

## 2. Set the first admin

In SQL Editor:

```sql
-- Replace YOUR_USER_UUID with the real user id (from Authentication → Users, or from profiles.user_id)
UPDATE public.profiles SET role = 'admin' WHERE user_id = 'YOUR_USER_UUID';
```

To find the UUID: **Authentication → Users** in Supabase, or query:

```sql
SELECT user_id, full_name, role FROM public.profiles WHERE full_name ILIKE '%yourname%';
```

## 3. Frontend

- **Sidebar:** Shows “Admin Panel” only when `profiles.role === 'admin'`.
- **Route:** `/dashboard/admin` is protected by `AdminGuard`; non-admins are redirected to `/dashboard`.

All admin actions (e.g. delete any link) are enforced by RLS in the database; the UI only hides or shows admin options based on `role`.

---

## 4. Pending links (moderation)

When users create or update a link (target URL, geo target, or redirect/fallback URL), the link is saved with `status = 'pending'`. Admins approve or reject from the Admin Panel.

**Run in SQL Editor** (after `add_admin_role.sql`):

- **File:** `supabase/migrations/link_status_pending_rejected.sql`

This adds:

- Allowed `status` values: `active`, `PAUSED`, `deleted`, `pending`, `rejected`
- RLS so admins can **SELECT** any link (to list pending) and **UPDATE** any link (to set status to `active` or `rejected`)

If you get a constraint error (e.g. existing constraint has a different name), drop that constraint first, then run the new `links_status_check`.
