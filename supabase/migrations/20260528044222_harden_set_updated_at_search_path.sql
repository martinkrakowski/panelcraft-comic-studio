-- Pin a fixed search_path on the set_updated_at trigger function.
--
-- Clears the function_search_path_mutable security advisor. The function body
-- only does `NEW.updated_at = NOW(); RETURN NEW;` and NOW() resolves from
-- pg_catalog (always implicitly searched), so an empty search_path is safe and
-- prevents search_path-injection via a mutable resolution order.

ALTER FUNCTION public.set_updated_at() SET search_path = '';
