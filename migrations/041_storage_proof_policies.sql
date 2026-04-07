-- Storage RLS policies for the "proof" bucket
-- Run this in the Supabase SQL Editor after creating the bucket named "proof"

-- Superadmin can upload files to proof bucket
CREATE POLICY "superadmin_upload_proof" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'proof'
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'superadmin')
  );

-- All authenticated users can view/download proof files
CREATE POLICY "authenticated_view_proof" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'proof'
    AND auth.uid() IS NOT NULL
  );

-- Superadmin can delete proof files
CREATE POLICY "superadmin_delete_proof" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'proof'
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'superadmin')
  );
