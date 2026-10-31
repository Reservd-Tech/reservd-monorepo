-- 1. Stop auto-assigning the 'owner' role to every new auth user.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $function$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Account status lives on the existing profiles table.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 3. Username -> internal auth email mapping.
CREATE TABLE IF NOT EXISTS public.auth_usernames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  normalized_username text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.auth_usernames TO authenticated;
GRANT ALL ON public.auth_usernames TO service_role;
ALTER TABLE public.auth_usernames ENABLE ROW LEVEL SECURITY;

CREATE POLICY auth_usernames_select_own ON public.auth_usernames
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin());

CREATE POLICY auth_usernames_admin_manage ON public.auth_usernames
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE TRIGGER trg_auth_usernames_updated
BEFORE UPDATE ON public.auth_usernames
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Admin audit log.
CREATE TABLE IF NOT EXISTS public.user_access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid,
  performed_by uuid,
  action text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.user_access_audit TO authenticated;
GRANT ALL ON public.user_access_audit TO service_role;
ALTER TABLE public.user_access_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_access_audit_admin_select ON public.user_access_audit
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

-- 5. Platform admins can read/manage every profile (user management table).
CREATE POLICY profiles_admin_select ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY profiles_admin_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- 6. Platform admins can read every role row (already have ALL, kept explicit).
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_usernames_user ON public.auth_usernames(user_id);