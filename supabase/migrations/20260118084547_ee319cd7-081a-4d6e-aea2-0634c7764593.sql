-- Create function to auto-assign admin role to super admin email
CREATE OR REPLACE FUNCTION public.handle_super_admin_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-assign admin role to super admin email
  IF NEW.email = 'shawn@guidepoint.co.bw' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-assign admin role on user creation
CREATE TRIGGER on_super_admin_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_super_admin_role();

-- Also add admin role if the super admin already exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'shawn@guidepoint.co.bw'
ON CONFLICT (user_id, role) DO NOTHING;