-- Create the receipts bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', true) 
ON CONFLICT (id) DO NOTHING;

-- Allow public access to read receipts
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Give public access to receipts' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Give public access to receipts" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
  END IF;
END $$;

-- Allow authenticated users to upload receipts
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Allow authenticated users to upload receipts' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Allow authenticated users to upload receipts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');
  END IF;
END $$;
