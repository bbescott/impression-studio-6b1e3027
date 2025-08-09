-- Make the bucket public-read and add a SELECT policy for public access
update storage.buckets set public = true where id = 'studio.sample.images';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Public read for studio sample images'
  ) THEN
    CREATE POLICY "Public read for studio sample images"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'studio.sample.images');
  END IF;
END $$;