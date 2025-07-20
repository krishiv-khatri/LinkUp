export const uploadImageToSupabase = async (
  imageUri: string,
  bucket: string,
  path: string,
  upsert = true
): Promise<string | null> => {
  try {
    const { supabase } = await import('@/lib/supabase');
    const response = await fetch(imageUri);
    const blob = await response.blob();

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, blob, {
        contentType: 'image/jpeg',
        upsert,
      });

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  } catch (error) {
    console.error('Upload error:', error);
    return null;
  }
};
