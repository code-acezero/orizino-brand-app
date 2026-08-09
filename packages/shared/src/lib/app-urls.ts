/**
 * Centralized Ecosystem App URLs helper.
 * Environment variables override these values when configured.
 */

export const APP_URLS = {
  storefront: process.env.NEXT_PUBLIC_STOREFRONT_URL || process.env.VITE_STOREFRONT_URL || process.env.STOREFRONT_URL || "https://shop.orizino.com",
  masterpanel: process.env.NEXT_PUBLIC_MASTERPANEL_URL || process.env.VITE_MASTERPANEL_URL || process.env.MASTERPANEL_URL || "https://mp.orizino.com",
  explore: process.env.NEXT_PUBLIC_EXPLORE_URL || process.env.VITE_EXPLORE_URL || process.env.EXPLORE_URL || "https://explore.orizino.com",
  company: process.env.NEXT_PUBLIC_COMPANY_URL || process.env.VITE_COMPANY_URL || process.env.COMPANY_URL || "https://orizino.com",
  orderops: process.env.NEXT_PUBLIC_ORDEROPS_URL || process.env.VITE_ORDEROPS_URL || process.env.ORDEROPS_URL || "https://om.orizino.com",
};

export function getAppUrl(appName: keyof typeof APP_URLS): string {
  return APP_URLS[appName] || "https://orizino.com";
}
