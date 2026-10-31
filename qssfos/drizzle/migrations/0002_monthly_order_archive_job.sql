CREATE OR REPLACE FUNCTION public.archive_past_months_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  p record;
  header text := '"Order #","Placed at","Customer","Phone","Source","Type","Status","Payment","Payment status","Payment reference","Items","Subtotal","Tax","Discount","Total","Notes"';
  body text;
  cnt integer;
  amount numeric;
  archived integer := 0;
BEGIN
  FOR p IN
    SELECT to_char(created_at, 'YYYY-MM') AS period
    FROM public.orders
    WHERE archived_at IS NULL
      AND created_at < date_trunc('month', now())
    GROUP BY 1
  LOOP
    SELECT
      string_agg(line, E'\n' ORDER BY ord),
      count(*),
      coalesce(sum(amt), 0)
    INTO body, cnt, amount
    FROM (
      SELECT
        o.created_at AS ord,
        CASE WHEN o.status::text = 'cancelled' THEN 0 ELSE o.total END AS amt,
        concat_ws(',',
          '"' || o.order_number || '"',
          '"' || to_char(o.created_at, 'DD Mon YYYY HH24:MI') || '"',
          '"' || replace(coalesce(o.customer_name, ''), '"', '""') || '"',
          '"' || replace(coalesce(o.customer_phone, ''), '"', '""') || '"',
          '"' || coalesce(o.source, '') || '"',
          '"' || o.order_type::text || '"',
          '"' || o.status::text || '"',
          '"' || coalesce(o.payment_method::text, '') || '"',
          '"' || o.payment_status::text || '"',
          '"' || replace(coalesce(o.payment_reference, ''), '"', '""') || '"',
          '"' || replace(coalesce((
            SELECT string_agg(oi.quantity || 'x ' || oi.product_name, '; ')
            FROM public.order_items oi WHERE oi.order_id = o.id
          ), ''), '"', '""') || '"',
          '"' || o.subtotal || '"',
          '"' || o.tax || '"',
          '"' || o.discount || '"',
          '"' || o.total || '"',
          '"' || replace(coalesce(o.notes, ''), '"', '""') || '"'
        ) AS line
      FROM public.orders o
      WHERE o.archived_at IS NULL
        AND o.created_at < date_trunc('month', now())
        AND to_char(o.created_at, 'YYYY-MM') = p.period
    ) rows;

    INSERT INTO public.order_archives (period, label, csv, order_count, total)
    VALUES (
      p.period,
      to_char(to_date(p.period || '-01', 'YYYY-MM-DD'), 'FMMonth YYYY'),
      header || E'\n' || coalesce(body, ''),
      cnt,
      amount
    )
    ON CONFLICT (period) DO UPDATE
      SET csv = public.order_archives.csv || E'\n' || coalesce(EXCLUDED.csv, ''),
          order_count = public.order_archives.order_count + EXCLUDED.order_count,
          total = public.order_archives.total + EXCLUDED.total;

    UPDATE public.orders
    SET archived_at = now()
    WHERE archived_at IS NULL
      AND created_at < date_trunc('month', now())
      AND to_char(created_at, 'YYYY-MM') = p.period;

    archived := archived + cnt;
  END LOOP;

  RETURN archived;
END;
$fn$;

REVOKE ALL ON FUNCTION public.archive_past_months_orders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archive_past_months_orders() TO service_role;