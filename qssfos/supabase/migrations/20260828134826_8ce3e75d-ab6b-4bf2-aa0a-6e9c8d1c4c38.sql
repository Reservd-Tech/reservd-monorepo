CREATE POLICY "Authenticated read shop media" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'shop-media');

CREATE POLICY "Authenticated upload shop media" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'shop-media');

CREATE POLICY "Owners update own shop media" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'shop-media' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'shop-media' AND owner = auth.uid());

CREATE POLICY "Owners delete own shop media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'shop-media' AND owner = auth.uid());