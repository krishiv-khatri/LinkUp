# Supabase Storage Setup Guide

This guide will help you set up Supabase Storage for image uploads in your LinkUp app.

## 🚀 Quick Setup

### 1. Create Storage Bucket

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **Create a new bucket**
4. Create a bucket named `images`
5. Set it as **Public bucket** (so images can be accessed via public URLs)

### 2. Set Up Storage Policies (RLS)

Navigate to **Storage** > **Policies** and create the following policies for the `images` bucket:

#### Policy 1: Allow authenticated users to upload images
```sql
-- Policy Name: Allow authenticated uploads
-- Operation: INSERT
-- Target roles: authenticated

(auth.role() = 'authenticated')
```

#### Policy 2: Allow public read access to images
```sql
-- Policy Name: Allow public read access
-- Operation: SELECT
-- Target roles: public

true
```

#### Policy 3: Allow users to update their own images
```sql
-- Policy Name: Allow users to update own images
-- Operation: UPDATE
-- Target roles: authenticated

(auth.role() = 'authenticated')
```

#### Policy 4: Allow users to delete their own images
```sql
-- Policy Name: Allow users to delete own images
-- Operation: DELETE
-- Target roles: authenticated

(auth.role() = 'authenticated')
```

### 3. Folder Structure

The app will automatically organize images in the following structure:
```
images/
├── profiles/
│   └── {userId}/
│       └── profile_images...
└── events/
    └── event_cover_images...
```

## 🔧 Configuration

The image upload service is already configured in `/services/imageUploadService.ts` and integrated into:

- ✅ Profile picture uploads (`ProfileEditModal.tsx`)
- ✅ Onboarding profile pictures (`onboarding-picture.tsx`)
- ✅ Event cover images (`create-event.tsx`, `edit-event.tsx`)

## 🧪 Testing

To test the image upload functionality:

1. **Profile Pictures**: 
   - Go to Profile tab → Edit Profile → Tap profile picture → Select image
   - Image should upload to Supabase Storage and display immediately

2. **Event Images**:
   - Create/Edit an event → Add cover image → Select from gallery/camera
   - Image should upload and be visible to all users

## 🐛 Troubleshooting

### Common Issues:

1. **"Upload Failed" Error**:
   - Check if the `images` bucket exists in Supabase Storage
   - Verify bucket is set to **Public**
   - Check storage policies are correctly configured

2. **Images Not Visible to Other Users**:
   - Ensure bucket is **Public**
   - Check the public read policy is enabled

3. **Permission Denied**:
   - Verify user is authenticated
   - Check upload policies allow authenticated users

### Debug Steps:

1. Check browser console/React Native logs for detailed error messages
2. Verify Supabase project URL and anon key in `/lib/supabase.ts`
3. Test storage access in Supabase Dashboard

## 📱 Features Implemented

- ✅ **Cloud Storage**: Images stored in Supabase Storage instead of local device
- ✅ **Public URLs**: Generated public URLs for cross-user image access
- ✅ **Organized Structure**: Images organized by type (profiles/events) and user
- ✅ **Error Handling**: Comprehensive error handling with user-friendly messages
- ✅ **Loading States**: Visual feedback during upload process
- ✅ **Centralized Service**: Single service for all image upload operations

## 🔐 Security

- Images are uploaded to user-specific folders when possible
- RLS policies ensure proper access control
- File names are randomized to prevent conflicts
- Only authenticated users can upload images
