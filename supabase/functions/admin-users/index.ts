import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPER_ADMIN_EMAIL = 'shawn@guidepoint.co.bw';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Access denied' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Check if current user is super admin
    const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'list';

    // Handle different actions
    if (action === 'list') {
      // Get all users with their profiles and roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to fetch users' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      // Get all roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      // Combine profiles with roles
      const users = profiles?.map(profile => ({
        ...profile,
        roles: roles?.filter(r => r.user_id === profile.user_id).map(r => r.role) || [],
        isSuperAdmin: profile.email === SUPER_ADMIN_EMAIL
      })) || [];

      return new Response(
        JSON.stringify({ success: true, users }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (action === 'create-admin') {
      // Only super admin can create other admins
      if (!isSuperAdmin) {
        return new Response(
          JSON.stringify({ success: false, error: 'Only super admin can create new admins' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        );
      }

      const { email, password, fullName } = await req.json();

      if (!email) {
        return new Response(
          JSON.stringify({ success: false, error: 'Email is required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // First, check if user already exists
      const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listError) {
        console.error('Error listing users:', listError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to check existing users' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      const existingUser = existingUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

      if (existingUser) {
        // User exists - check if already admin
        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', existingUser.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (existingRole) {
          return new Response(
            JSON.stringify({ success: false, error: 'This user is already an admin' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        // Assign admin role to existing user
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ user_id: existingUser.id, role: 'admin' });

        if (roleError) {
          console.error('Error assigning role:', roleError);
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to assign admin role' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Admin role assigned to existing user',
            user: { id: existingUser.id, email: existingUser.email }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      // User doesn't exist - create new user (password required)
      if (!password) {
        return new Response(
          JSON.stringify({ success: false, error: 'Password is required for new users' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Create user with admin service role
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: { full_name: fullName || '' }
      });

      if (createError) {
        console.error('Error creating user:', createError);
        return new Response(
          JSON.stringify({ success: false, error: createError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Assign admin role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: newUser.user.id, role: 'admin' });

      if (roleError) {
        console.error('Error assigning role:', roleError);
        // User was created but role assignment failed - still return success with warning
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'User created but role assignment failed. Please assign role manually.',
            user: { id: newUser.user.id, email: newUser.user.email }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Admin user created successfully',
          user: { id: newUser.user.id, email: newUser.user.email }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (action === 'assign-role') {
      const { userId, role } = await req.json();

      if (!userId || !role) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing userId or role' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Check if target user is super admin (cannot modify)
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', userId)
        .single();

      if (targetProfile?.email === SUPER_ADMIN_EMAIL) {
        return new Response(
          JSON.stringify({ success: false, error: 'Cannot modify super admin roles' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        );
      }

      const { error: insertError } = await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role }, { onConflict: 'user_id,role' });

      if (insertError) {
        console.error('Error assigning role:', insertError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to assign role' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Role assigned successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (action === 'remove-role') {
      const { userId, role } = await req.json();

      if (!userId || !role) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing userId or role' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Check if target user is super admin (cannot modify)
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', userId)
        .single();

      if (targetProfile?.email === SUPER_ADMIN_EMAIL) {
        return new Response(
          JSON.stringify({ success: false, error: 'Cannot modify super admin roles' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        );
      }

      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (deleteError) {
        console.error('Error removing role:', deleteError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to remove role' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Role removed successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );

  } catch (error: unknown) {
    console.error('Error in admin-users:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
