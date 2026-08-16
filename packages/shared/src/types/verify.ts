export type VerifyResult = {
  found: boolean;
  genuine: boolean;
  is_sample?: boolean;
  sample_info?: {
    title: string;
    description: string;
    prefix?: string;
  };
  serial_code?: string;
  status?: string;
  product?: {
    name: string;
    slug: string | null;
    thumbnail: string | null;
    images: string[] | null;
    category?: string | null;
  };
  sold?: {
    sold_at_masked?: string | null;
    sold_at?: string | null;
    buyer_masked?: string | null;
    is_owner?: boolean;
    order?: {
      order_number: string;
      total: number;
      shipping_address: any;
      payment_status: string | null;
    };
  };
};
