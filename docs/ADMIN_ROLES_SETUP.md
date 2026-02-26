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
