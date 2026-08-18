-- Migration: 20260818000001_verify_public_serial_rpc.sql
-- Description: Create public verification RPC function for product serials and consignment order authenticity

CREATE OR REPLACE FUNCTION public.verify_public_serial(lookup_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raw TEXT := TRIM(lookup_code);
  v_hyphenated TEXT;
  v_serial RECORD;
  v_product RECORD;
  v_order RECORD;
  v_buyer_masked TEXT := 'Valued Client';
  v_sold_at_masked TEXT := NULL;
BEGIN
  IF v_raw IS NULL OR v_raw = '' THEN
    RETURN jsonb_build_object('found', false, 'genuine', false, 'serial_code', '');
  END IF;

  -- 1. Strip common prefixes
  v_raw := regexp_replace(v_raw, '^(SN|S/N|SERIAL|CODE):?\s*', '', 'i');
  v_raw := regexp_replace(v_raw, '^#', '');
  v_raw := TRIM(v_raw);

  -- 2. Normalize hyphens
  v_hyphenated := upper(regexp_replace(v_raw, '[\s_.]+', '-', 'g'));

  -- 3. Search product_serials
  SELECT ps.serial_code, ps.status, ps.sold_at, ps.sold_order_id, ps.product_id
  INTO v_serial
  FROM product_serials ps
  WHERE ps.serial_code = v_raw
     OR ps.serial_code = v_hyphenated
     OR ps.serial_code ILIKE v_hyphenated
     OR ps.serial_code ILIKE v_raw
  LIMIT 1;

  IF v_serial.serial_code IS NOT NULL THEN
    -- Fetch product details with category
    SELECT p.name, p.slug, p.thumbnail, p.images, c.name AS category_name
    INTO v_product
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.id = v_serial.product_id;

    -- Handle sold status
    IF v_serial.status = 'sold' THEN
      IF v_serial.sold_at IS NOT NULL THEN
        v_sold_at_masked := to_char(v_serial.sold_at, 'Mon YYYY');
      ELSE
        v_sold_at_masked := 'Recorded at Store';
      END IF;

      IF v_serial.sold_order_id IS NOT NULL THEN
        SELECT customer_name, guest_email INTO v_order FROM orders WHERE id = v_serial.sold_order_id;
        IF v_order.customer_name IS NOT NULL AND length(v_order.customer_name) > 0 THEN
          v_buyer_masked := overlay(v_order.customer_name placing '***' from 2 for length(v_order.customer_name) - 2);
        ELSIF v_order.guest_email IS NOT NULL THEN
          v_buyer_masked := overlay(split_part(v_order.guest_email, '@', 1) placing '***' from 2 for 3);
        END IF;
      END IF;

      RETURN jsonb_build_object(
        'found', true,
        'genuine', true,
        'is_sample', false,
        'serial_code', v_serial.serial_code,
        'status', v_serial.status,
        'product', CASE WHEN v_product.name IS NOT NULL THEN jsonb_build_object(
          'name', v_product.name,
          'slug', v_product.slug,
          'thumbnail', v_product.thumbnail,
          'images', v_product.images,
          'category', v_product.category_name
        ) ELSE NULL END,
        'sold', jsonb_build_object(
          'sold_at_masked', COALESCE(v_sold_at_masked, 'Recorded at Store'),
          'buyer_masked', v_buyer_masked,
          'is_owner', false
        )
      );
    ELSE
      -- Unsold / Available
      RETURN jsonb_build_object(
        'found', true,
        'genuine', true,
        'is_sample', false,
        'serial_code', v_serial.serial_code,
        'status', v_serial.status,
        'product', CASE WHEN v_product.name IS NOT NULL THEN jsonb_build_object(
          'name', v_product.name,
          'slug', v_product.slug,
          'thumbnail', v_product.thumbnail,
          'images', v_product.images,
          'category', v_product.category_name
        ) ELSE NULL END
      );
    END IF;
  END IF;

  -- 4. Check if code is an Order Number
  SELECT id, order_number, total, customer_name, guest_email, created_at, shipping_address, payment_status
  INTO v_order
  FROM orders
  WHERE order_number ILIKE '%' || v_raw || '%'
  LIMIT 1;

  IF v_order.order_number IS NOT NULL THEN
    IF v_order.customer_name IS NOT NULL AND length(v_order.customer_name) > 0 THEN
      v_buyer_masked := overlay(v_order.customer_name placing '***' from 2 for length(v_order.customer_name) - 2);
    ELSIF v_order.guest_email IS NOT NULL THEN
      v_buyer_masked := overlay(split_part(v_order.guest_email, '@', 1) placing '***' from 2 for 3);
    END IF;

    RETURN jsonb_build_object(
      'found', true,
      'genuine', true,
      'is_sample', false,
      'serial_code', v_order.order_number,
      'status', 'order_verified',
      'product', jsonb_build_object(
        'name', 'Orizino Atelier Piece',
        'slug', NULL,
        'thumbnail', NULL,
        'images', NULL,
        'category', 'Consignment Order'
      ),
      'sold', jsonb_build_object(
        'sold_at_masked', to_char(v_order.created_at, 'Mon YYYY'),
        'buyer_masked', v_buyer_masked,
        'is_owner', false,
        'order', jsonb_build_object(
          'order_number', v_order.order_number,
          'total', v_order.total,
          'shipping_address', v_order.shipping_address,
          'payment_status', v_order.payment_status
        )
      )
    );
  END IF;

  -- 5. Check if SKU matches a product
  SELECT p.name, p.slug, p.sku, p.thumbnail, p.images, c.name AS category_name
  INTO v_product
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  WHERE p.is_active = true AND (p.sku ILIKE v_raw OR p.sku ILIKE v_hyphenated)
  LIMIT 1;

  IF v_product.name IS NOT NULL THEN
    RETURN jsonb_build_object(
      'found', true,
      'genuine', false,
      'is_sample', false,
      'serial_code', v_raw,
      'status', 'unregistered',
      'product', jsonb_build_object(
        'name', v_product.name,
        'slug', v_product.slug,
        'thumbnail', v_product.thumbnail,
        'images', v_product.images,
        'category', v_product.category_name
      )
    );
  END IF;

  -- 6. Check for Sample/Test tag
  IF upper(v_raw) LIKE '%SAMPLE%' OR upper(v_raw) LIKE '%TEST%' OR upper(v_raw) LIKE '%DEMO%' OR upper(v_raw) LIKE 'ORZ-SAMPLE%' THEN
    RETURN jsonb_build_object(
      'found', true,
      'genuine', true,
      'is_sample', true,
      'serial_code', v_raw,
      'status', 'sample',
      'sample_info', jsonb_build_object(
        'title', 'Official Orizino Royal Demonstration Code',
        'description', 'This is an authentic verified test QR generated by Orizino Atelier for high-precision printing calibration and verification testing.',
        'prefix', split_part(v_raw, '-', 1)
      )
    );
  END IF;

  -- 7. Not found
  RETURN jsonb_build_object(
    'found', false,
    'genuine', false,
    'serial_code', v_raw
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_public_serial(TEXT) TO anon, authenticated, service_role;
