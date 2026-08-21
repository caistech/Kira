import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Verify environment variables are loaded
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('Error: Missing Supabase environment variables');
  console.error('Please ensure .env.local contains:');
  console.error('SUPABASE_URL=your_supabase_project_url');
  console.error('SUPABASE_SERVICE_KEY=your_supabase_service_key');
  process.exit(1);
}

// Create Supabase client with error handling
let supabase;
try {
  supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
} catch (error) {
  console.error('Error creating Supabase client:', error);
  process.exit(1);
}

export async function checkVoiceAgentStatus(email: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('beta_codes')
      .select('voice_agent_status')
      .eq('email', email)
      .single();

    if (error) {
      console.error(`Error checking voice agent status for ${email}:`, error);
      return null;
    }

    // Handle the "disabled" status
    if (data?.voice_agent_status === 'disabled') {
      console.log(`Voice agent is disabled for ${email}`);
      return 'disabled';
    }

    return data?.voice_agent_status || 'enabled'; // Default to 'enabled' if status is missing
  } catch (error) {
    console.error(`Error checking voice agent status for ${email}:`, error);
    return null;
  }
}

export async function compareUserRoles(email: string): Promise<string | null> {
  try {
    // First get the user ID from beta_codes
    const { data: userData, error: userError } = await supabase
      .from('beta_codes')
      .select('redeemed_user_id')
      .eq('email', email)
      .single();

    if (userError || !userData?.redeemed_user_id) {
      console.error(`Error finding user ID for ${email}:`, userError);
      return null;
    }

    // Then get the role from users table
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userData.redeemed_user_id)
      .single();

    if (error) {
      console.error(`Error checking user role for ${email}:`, error);
      return null;
    }

    return data?.role || 'authenticated'; // Default to 'authenticated' if role is missing
  } catch (error) {
    console.error(`Error checking user role for ${email}:`, error);
    return null;
  }
}

export async function checkFeatureFlags(email: string): Promise<any[]> {
  try {
    // First get the user ID from beta_codes
    const { data: userData, error: userError } = await supabase
      .from('beta_codes')
      .select('redeemed_user_id')
      .eq('email', email)
      .single();

    if (userError || !userData?.redeemed_user_id) {
      console.error(`Error finding user ID for ${email}:`, userError);
      return [];
    }

    // Then get feature flags from system_flags table
    const { data, error } = await supabase
      .from('system_flags')
      .select('*')
      .eq('user_id', userData.redeemed_user_id);

    if (error) {
      console.error(`Error checking feature flags for ${email}:`, error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error(`Error checking feature flags for ${email}:`, error);
    return [];
  }
}

export async function checkEnvironment(email: string): Promise<string | null> {
  try {
    // First get the user ID from beta_codes
    const { data: userData, error: userError } = await supabase
      .from('beta_codes')
      .select('redeemed_user_id')
      .eq('email', email)
      .single();

    if (userError || !userData?.redeemed_user_id) {
      console.error(`Error finding user ID for ${email}:`, userError);
      return null;
    }

    // Then get environment from unanswered_alert_sends table
    const { data, error } = await supabase
      .from('unanswered_alert_sends')
      .select('environment')
      .eq('user_id', userData.redeemed_user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error(`Error checking environment for ${email}:`, error);
      return null;
    }

    return data?.environment || process.env.DEFAULT_ENVIRONMENT || 'production';
  } catch (error) {
    console.error(`Error checking environment for ${email}:`, error);
    return null;
  }
}

export async function checkVoiceAgentConfiguration(): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('voice_agent_config')
      .select('*')
      .single();

    if (error) {
      console.error('Error checking voice agent configuration:', error);
      return null;
    }

    return data || null;
  } catch (error) {
    console.error('Error checking voice agent configuration:', error);
    return null;
  }
}

export async function checkAuthenticationFlow(email: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('email_logs')
      .select('*')
      .eq('recipient_email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error(`Error checking authentication flow for ${email}:`, error);
      return null;
    }

    return data || null;
  } catch (error) {
    console.error(`Error checking authentication flow for ${email}:`, error);
    return null;
  }
}