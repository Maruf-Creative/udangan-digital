import { supabase } from './supabase';

const BUCKET_NAME = 'media';

/**
 * Upload file ke Supabase Storage
 */
export async function uploadFile(
  file: File,
  folder: string = 'gallery'
): Promise<string | null> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${folder}/${Date.now()}-${Math.random()
    .toString(36)
    .substring(2)}.${fileExt}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, file);

  if (error) {
    console.error('Error uploading file:', error.message);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

/**
 * Hapus file dari Supabase Storage berdasarkan URL
 */
export async function deleteFile(fileUrl: string): Promise<boolean> {
  // Ambil path relatif dari URL lengkap
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl('');

  const baseUrl = urlData.publicUrl;
  const relativePath = fileUrl.replace(baseUrl, '');

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([relativePath]);

  if (error) {
    console.error('Error deleting file:', error.message);
    return false;
  }
  return true;
}
