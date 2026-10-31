UPDATE public.storefronts s
SET owner_id = COALESCE(
  (SELECT p.created_by FROM public.products p WHERE p.storefront_id = s.id AND p.created_by IS NOT NULL ORDER BY p.created_at LIMIT 1),
  (SELECT c.created_by FROM public.categories c WHERE c.storefront_id = s.id AND c.created_by IS NOT NULL ORDER BY c.created_at LIMIT 1),
  (SELECT u.id FROM auth.users u WHERE u.created_at <= s.created_at ORDER BY u.created_at DESC LIMIT 1)
)
WHERE s.owner_id IS NULL;