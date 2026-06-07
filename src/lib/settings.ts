import { supabase } from './supabase';

// Semua key pengaturan yang tersedia
export type SettingKey =
  | 'group_name'
  | 'group_subtitle'
  | 'group_photo'
  | 'groom_name'
  | 'bride_name'
  | 'event_date'
  | 'event_time'
  | 'event_location'
  | 'maps_link'
  | 'videocall_link'
  | 'phone_number'
  | 'initial_chats'
  | 'media_gallery';

/**
 * Ambil semua pengaturan dari tabel invitation_settings
 */
export async function getAllSettings(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('invitation_settings')
    .select('key, value');

  if (error) {
    console.error('Error fetching settings:', error.message);
    return {};
  }

  const settings: Record<string, string> = {};
  data?.forEach((row: { key: string; value: string }) => {
    settings[row.key] = row.value;
  });
  return settings;
}

/**
 * Ambil satu pengaturan berdasarkan key
 */
export async function getSetting(key: SettingKey): Promise<string | null> {
  const { data, error } = await supabase
    .from('invitation_settings')
    .select('value')
    .eq('key', key)
    .single();

  if (error) return null;
  return data?.value ?? null;
}

/**
 * Simpan atau update satu pengaturan
 */
export async function upsertSetting(key: string, value: string): Promise<boolean> {
  const { error } = await supabase
    .from('invitation_settings')
    .upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );

  if (error) {
    console.error('Error saving setting:', error.message);
    return false;
  }
  return true;
}

/**
 * Simpan atau update beberapa pengaturan sekaligus
 */
export async function upsertMultipleSettings(
  settings: Record<string, string>
): Promise<boolean> {
  const rows = Object.entries(settings).map(([key, value]) => ({
    key,
    value,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('invitation_settings')
    .upsert(rows, { onConflict: 'key' });

  if (error) {
    console.error('Error saving settings:', error.message);
    return false;
  }
  return true;
}
