CREATE OR REPLACE FUNCTION public.bulk_accept_item_orders(p_product_id uuid, p_capacity integer, p_expected jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE shop_id uuid; snapshot jsonb; selected jsonb := '[]'::jsonb; actual integer := 0; demand integer := 0; row_data record; result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_active) THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF p_capacity IS NULL OR p_capacity <= 0 THEN RAISE EXCEPTION 'Quantity must be a positive integer'; END IF;
 SELECT storefront_id INTO shop_id FROM public.products WHERE id=p_product_id;
 IF shop_id IS NULL OR NOT public.caller_owns_product(p_product_id) THEN RAISE EXCEPTION 'Not authorized for this item'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(shop_id::text,0));
 PERFORM o.id FROM public.orders o WHERE o.storefront_id=shop_id AND o.status='pending' AND o.archived_at IS NULL AND EXISTS (SELECT 1 FROM public.order_items i WHERE i.order_id=o.id AND i.product_id=p_product_id) ORDER BY o.created_at,o.id FOR UPDATE;
 PERFORM i.id FROM public.order_items i JOIN public.orders o ON o.id=i.order_id WHERE o.storefront_id=shop_id AND o.status='pending' AND o.archived_at IS NULL AND EXISTS (SELECT 1 FROM public.order_items t WHERE t.order_id=o.id AND t.product_id=p_product_id) ORDER BY i.id FOR UPDATE OF i;
 SELECT coalesce(jsonb_agg(x.payload ORDER BY x.created_at,x.id),'[]'::jsonb) INTO snapshot FROM (
 SELECT o.id,o.created_at,jsonb_build_object('id',o.id,'orderNumber',o.order_number,'updatedAt',o.updated_at,'createdAt',o.created_at,'items',(SELECT jsonb_agg(jsonb_build_object('id',i.id,'productId',i.product_id,'name',i.product_name,'quantity',i.quantity) ORDER BY i.id) FROM public.order_items i WHERE i.order_id=o.id)) AS payload
 FROM public.orders o WHERE o.storefront_id=shop_id AND o.status='pending' AND o.archived_at IS NULL AND EXISTS (SELECT 1 FROM public.order_items i WHERE i.order_id=o.id AND i.product_id=p_product_id)) x;
 FOR row_data IN SELECT value AS payload FROM jsonb_array_elements(snapshot) LOOP
  demand := demand + (SELECT coalesce(sum((i->>'quantity')::integer),0) FROM jsonb_array_elements(row_data.payload->'items') i WHERE i->>'productId'=p_product_id::text);
 END LOOP;
 IF p_expected IS NOT NULL AND p_expected IS DISTINCT FROM snapshot THEN RAISE EXCEPTION 'Demand changed. Review the allocation again.' USING ERRCODE='40001'; END IF;
 IF p_capacity > demand THEN RAISE EXCEPTION 'Capacity exceeds current pending demand. Review again.'; END IF;
 FOR row_data IN SELECT value AS payload FROM jsonb_array_elements(snapshot) LOOP
  DECLARE units integer; BEGIN
   SELECT coalesce(sum((i->>'quantity')::integer),0) INTO units FROM jsonb_array_elements(row_data.payload->'items') i WHERE i->>'productId'=p_product_id::text;
   EXIT WHEN actual+units > p_capacity;
   actual:=actual+units; selected:=selected || jsonb_build_array(row_data.payload);
  END;
 END LOOP;
 IF p_expected IS NOT NULL THEN
  IF actual=0 THEN RAISE EXCEPTION 'Capacity does not fit the oldest complete order'; END IF;
  UPDATE public.orders SET status='preparing',accepted_at=now(),rejection_reason=NULL WHERE id IN (SELECT (value->>'id')::uuid FROM jsonb_array_elements(selected)) AND status='pending' AND archived_at IS NULL;
 END IF;
 result:=jsonb_build_object('snapshot',snapshot,'orders',selected,'quantity',actual,'remaining',demand-actual,'committed',p_expected IS NOT NULL);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.bulk_accept_item_orders(uuid,integer,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bulk_accept_item_orders(uuid,integer,jsonb) TO authenticated;
COMMENT ON FUNCTION public.bulk_accept_item_orders(uuid,integer,jsonb) IS 'Rush Mode whole-order FIFO acceptance: preview snapshot, lock and revalidate on commit; never changes payment or preparation quantities.';