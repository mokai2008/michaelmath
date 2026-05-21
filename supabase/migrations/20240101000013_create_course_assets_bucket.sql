DROP POLICY IF EXISTS "course_assets_public_read" ON storage.objects;
DROP POLICY IF EXISTS "course_assets_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "course_assets_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "course_assets_auth_delete" ON storage.objects;

-- Create the course-assets bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-assets', 'course-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to course-assets
CREATE POLICY "course_assets_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'course-assets');

-- Allow authenticated users to upload to course-assets
CREATE POLICY "course_assets_auth_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course-assets');

-- Allow authenticated users to update files in course-assets
CREATE POLICY "course_assets_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'course-assets');

-- Allow authenticated users to delete files from course-assets
CREATE POLICY "course_assets_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'course-assets');
