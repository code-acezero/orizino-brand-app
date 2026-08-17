export interface TelegramBotConfig {
  bot_token?: string;
  use_direct_api: boolean;
  webhook_url?: string;
  welcome_text: string;
  order_template: string;
  support_template: string;
  call_template: string;
  daily_digest_template: string;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  commands_enabled: boolean;
  interactive_buttons: Array<{ label: string; url?: string; callback_data?: string }>;
}

export const defaultTelegramBotConfig: TelegramBotConfig = {
  bot_token: "",
  use_direct_api: false,
  webhook_url: "",
  welcome_text: "👋 Welcome to <b>ORIZINO Luxury Fit Studio Bot</b>!\n\nUse the buttons below to browse our collection, track your order, or reach our concierge team.",
  order_template: "🛍 <b>New Order Received!</b>\n\n<b>Order ID:</b> #{{order_id}}\n<b>Customer:</b> {{customer_name}}\n<b>Phone:</b> {{customer_phone}}\n<b>Total:</b> ৳{{total_amount}}\n<b>Payment:</b> {{payment_method}}\n<b>Items:</b>\n{{items_list}}\n\n📍 <i>{{shipping_address}}</i>",
  support_template: "💬 <b>Support Request Escalated</b>\n\n<b>Customer:</b> {{customer_name}}\n<b>Email / Phone:</b> {{customer_contact}}\n<b>Ticket:</b> #{{ticket_id}}\n<b>Message:</b>\n<i>\"{{message_snippet}}\"</i>",
  call_template: "📞 <b>Voice Call Alert</b>\n\n<b>Customer:</b> {{customer_name}}\n<b>Status:</b> {{call_status}}\n<b>Duration:</b> {{duration}}\n<b>Time:</b> {{call_time}}",
  daily_digest_template: "📊 <b>Daily Store Digest</b>\n\n<b>Total Orders:</b> {{total_orders}}\n<b>Gross Revenue:</b> ৳{{gross_revenue}}\n<b>Top Item:</b> {{top_product}}\n<b>Pending Dispatch:</b> {{pending_dispatch}}",
  quiet_hours_enabled: false,
  quiet_hours_start: "23:00",
  quiet_hours_end: "08:00",
  commands_enabled: true,
  interactive_buttons: [
    { label: "🛍 Shop Online", url: "https://orizino.com/shop" },
    { label: "📦 Track Order", url: "https://orizino.com/orders" },
    { label: "💬 Contact Concierge", url: "https://orizino.com/support" },
  ],
};
