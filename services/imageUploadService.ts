import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system';

export interface ImageUploadResult {
  success: boolean;
  publicUrl?: string;
  error?: string;
}

export const imageUploadService = {
  /**
   * Upload an image to Supabase Storage and return the public URL
   * @param imageUri - Local file URI from ImagePicker
   * @param bucket - Storage bucket name (default: 'images')
   * @param folder - Optional folder path within the bucket
   * @returns Promise with upload result containing public URL or error
   */
  async uploadImage(
    imageUri: string,
    bucket: string = 'images',
    folder?: string
  ): Promise<ImageUploadResult> {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = imageUri.split('.').pop() || 'jpg';
      const fileName = `${timestamp}_${randomString}.${fileExtension}`;
      const filePath = folder ? `${folder}/${fileName}` : fileName;

      // Read the file as base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to blob
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, byteArray, {
          contentType: `image/${fileExtension}`,
          upsert: false,
        });

      if (error) {
        console.error('Storage upload error:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return {
        success: true,
        publicUrl: publicUrlData.publicUrl,
      };
    } catch (error) {
      console.error('Image upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },

  /**
   * Upload a profile picture to Supabase Storage
   * @param imageUri - Local file URI from ImagePicker
   * @param userId - User ID for organizing files
   * @returns Promise with upload result
   */
  async uploadProfilePicture(imageUri: string, userId: string): Promise<ImageUploadResult> {
    return this.uploadImage(imageUri, 'images', `profiles/${userId}`);
  },

  /**
   * Upload an event cover image to Supabase Storage
   * @param imageUri - Local file URI from ImagePicker
   * @param eventId - Event ID for organizing files (optional, can use timestamp if creating new event)
   * @returns Promise with upload result
   */
  async uploadEventCover(imageUri: string, eventId?: string): Promise<ImageUploadResult> {
    const folder = eventId ? `events/${eventId}` : 'events';
    return this.uploadImage(imageUri, 'images', folder);
  },

  /**
   * Delete an image from Supabase Storage
   * @param filePath - Path to the file in storage
   * @param bucket - Storage bucket name (default: 'images')
   * @returns Promise with deletion result
   */
  async deleteImage(filePath: string, bucket: string = 'images'): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) {
        console.error('Storage delete error:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Image delete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },

  /**
   * Extract file path from Supabase public URL for deletion
   * @param publicUrl - Public URL from Supabase Storage
   * @param bucket - Storage bucket name (default: 'images')
   * @returns File path or null if URL is invalid
   */
  extractFilePathFromUrl(publicUrl: string, bucket: string = 'images'): string | null {
    try {
      const url = new URL(publicUrl);
      const pathSegments = url.pathname.split('/');
      const bucketIndex = pathSegments.findIndex(segment => segment === bucket);
      
      if (bucketIndex === -1 || bucketIndex === pathSegments.length - 1) {
        return null;
      }
      
      return pathSegments.slice(bucketIndex + 1).join('/');
    } catch {
      return null;
    }
  },
};
