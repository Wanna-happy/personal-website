BEGIN;
CREATE TABLE IF NOT EXISTS public.portfolio_admin_state (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  expires bigint NOT NULL
);
ALTER TABLE public.portfolio_admin_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.portfolio_admin_state FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_admin_state TO service_role;
CREATE INDEX IF NOT EXISTS portfolio_admin_state_expiry ON public.portfolio_admin_state(expires);

-- Invoker privileges are essential: an anonymous RPC caller cannot access this table.
CREATE OR REPLACE FUNCTION public.portfolio_admin_state_rpc(
  operation text, record_key text DEFAULT '', record_value jsonb DEFAULT 'null'::jsonb,
  record_expires bigint DEFAULT 0, before_time bigint DEFAULT 0
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE
  now_ms bigint := floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint;
  result jsonb;
  attempts jsonb;
BEGIN
  IF operation = 'ready' THEN
    PERFORM key FROM public.portfolio_admin_state LIMIT 1;
    RETURN 'true'::jsonb;
  ELSIF operation = 'get' THEN
    SELECT value INTO result FROM public.portfolio_admin_state WHERE key = record_key AND expires > now_ms;
    RETURN result;
  ELSIF operation = 'put' THEN
    INSERT INTO public.portfolio_admin_state(key,value,expires) VALUES(record_key,record_value,record_expires)
    ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value, expires=EXCLUDED.expires;
  ELSIF operation = 'delete' THEN
    DELETE FROM public.portfolio_admin_state WHERE key=record_key;
  ELSIF operation IN ('reserve', 'clear') THEN
    INSERT INTO public.portfolio_admin_state(key,value,expires) VALUES('attempts','[]'::jsonb,now_ms+900000)
    ON CONFLICT(key) DO NOTHING;
    SELECT value INTO attempts FROM public.portfolio_admin_state WHERE key='attempts' FOR UPDATE;
    SELECT COALESCE(jsonb_agg(t),'[]'::jsonb) INTO attempts FROM jsonb_array_elements(attempts) AS t
      WHERE t::bigint > CASE WHEN operation='clear' THEN before_time ELSE now_ms-900000 END;
    IF operation='reserve' THEN
      IF jsonb_array_length(attempts)>=5 THEN RETURN 'false'::jsonb; END IF;
      attempts := attempts || to_jsonb(now_ms);
    END IF;
    UPDATE public.portfolio_admin_state SET value=attempts,expires=now_ms+900000 WHERE key='attempts';
    RETURN CASE WHEN operation='reserve' THEN to_jsonb(now_ms) ELSE 'true'::jsonb END;
  ELSIF operation = 'cleanup' THEN
    DELETE FROM public.portfolio_admin_state WHERE expires <= now_ms;
  ELSE
    RAISE EXCEPTION 'Unknown operation';
  END IF;
  RETURN 'true'::jsonb;
END;
$$;
REVOKE ALL ON FUNCTION public.portfolio_admin_state_rpc(text,text,jsonb,bigint,bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portfolio_admin_state_rpc(text,text,jsonb,bigint,bigint) TO service_role;
COMMIT;
