import { createClient } from '@supabase/supabase-js';

// Ganti nilai di bawah ini dengan URL dan Anon Key dari project Supabase Anda.
// Anda bisa menemukannya di Supabase Dashboard -> Project Settings -> API.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE';

export const supabase = createClient(supabaseUrl, supabaseKey);
