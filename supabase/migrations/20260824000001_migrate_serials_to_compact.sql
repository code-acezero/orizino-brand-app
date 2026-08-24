-- Migration: Compact Serial Number Format
-- Updates existing product serials to follow Option 1 compact format: [SKU][VAR]-[001]

DO $$
DECLARE
    r RECORD;
    v_prefix TEXT;
    v_product_token TEXT;
    v_variant_token TEXT;
    v_seq INT;
    v_new_code TEXT;
BEGIN
    FOR r IN (
        SELECT 
            ps.id,
            ps.serial_code,
            ps.product_id,
            ps.variant_id,
            COALESCE(p.sku, p.name, 'PRD') AS product_name,
            COALESCE(pv.sku, pv.size, pv.color, '') AS variant_name,
            ROW_NUMBER() OVER (PARTITION BY ps.product_id, COALESCE(ps.variant_id, '00000000-0000-0000-0000-000000000000'::uuid) ORDER BY ps.created_at ASC) AS seq_num
        FROM product_serials ps
        LEFT JOIN products p ON p.id = ps.product_id
        LEFT JOIN product_variants pv ON pv.id = ps.variant_id
        ORDER BY ps.created_at ASC
    ) LOOP
        -- Clean product token (max 5 chars)
        v_product_token := SUBSTRING(REGEXP_REPLACE(UPPER(r.product_name), '[^A-Z0-9]', '', 'g') FROM 1 FOR 5);
        IF v_product_token IS NULL OR v_product_token = '' THEN
            v_product_token := 'PRD';
        END IF;

        -- Clean variant token (max 3 chars)
        v_variant_token := SUBSTRING(REGEXP_REPLACE(UPPER(r.variant_name), '[^A-Z0-9]', '', 'g') FROM 1 FOR 3);

        IF v_variant_token IS NOT NULL AND v_variant_token <> '' THEN
            v_prefix := v_product_token || v_variant_token;
        ELSE
            v_prefix := v_product_token;
        END IF;

        v_new_code := v_prefix || '-' || LPAD(r.seq_num::TEXT, 3, '0');

        IF r.serial_code <> v_new_code THEN
            UPDATE product_serials SET serial_code = v_new_code, updated_at = NOW() WHERE id = r.id;
        END IF;
    END LOOP;
END $$;
