"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@orizino/supabase/client";
import { useAuth } from "./AuthContext";
import { toast } from "../lib/app-toast";

export interface LangDef {
  code: string;
  label: string;
  nativeLabel: string;
  region: "Asia" | "Europe" | "Americas" | "Middle East" | "Other";
  dir: "ltr" | "rtl";
  countryNames?: string[];
  fontFamilyDisplay?: string;
  fontFamilyBody?: string;
  googleFontQuery?: string;
}

export const ALL_LANGUAGES: LangDef[] = [
  // Default International
  {
    code: "en",
    label: "English",
    nativeLabel: "English",
    region: "Europe",
    dir: "ltr",
    countryNames: ["United States", "United Kingdom", "Canada", "Australia", "New Zealand", "Global"],
    fontFamilyDisplay: "'Instrument Serif', 'Cinzel', serif",
    fontFamilyBody: "'Plus Jakarta Sans', sans-serif",
  },

  // ── ASIAN LANGUAGES ──
  {
    code: "bn",
    label: "Bengali",
    nativeLabel: "বাংলা",
    region: "Asia",
    dir: "ltr",
    countryNames: ["Bangladesh", "India"],
    fontFamilyDisplay: "'Anek Bangla', 'Noto Serif Bengali', serif",
    fontFamilyBody: "'Hind Siliguri', 'Anek Bangla', sans-serif",
    googleFontQuery: "family=Anek+Bangla:wght@300;400;500;600;700;800&family=Hind+Siliguri:wght@300;400;500;600;700&family=Noto+Serif+Bengali:wght@400;600;700",
  },
  {
    code: "hi",
    label: "Hindi",
    nativeLabel: "हिन्दी",
    region: "Asia",
    dir: "ltr",
    countryNames: ["India"],
    fontFamilyDisplay: "'Noto Serif Devanagari', 'Rozha One', serif",
    fontFamilyBody: "'Noto Serif Devanagari', 'Poppins', sans-serif",
    googleFontQuery: "family=Noto+Serif+Devanagari:wght@400;600;700&family=Rozha+One",
  },
  {
    code: "ja",
    label: "Japanese",
    nativeLabel: "日本語",
    region: "Asia",
    dir: "ltr",
    countryNames: ["Japan"],
    fontFamilyDisplay: "'Shippori Mincho', 'Noto Serif JP', serif",
    fontFamilyBody: "'Noto Serif JP', sans-serif",
    googleFontQuery: "family=Shippori+Mincho:wght@400;600;700&family=Noto+Serif+JP:wght@400;600;700",
  },
  {
    code: "ko",
    label: "Korean",
    nativeLabel: "한국어",
    region: "Asia",
    dir: "ltr",
    countryNames: ["South Korea", "Korea"],
    fontFamilyDisplay: "'Noto Serif KR', 'Gowun Batang', serif",
    fontFamilyBody: "'Noto Serif KR', sans-serif",
    googleFontQuery: "family=Noto+Serif+KR:wght@400;600;700&family=Gowun+Batang:wght@400;700",
  },
  {
    code: "zh",
    label: "Chinese (Simplified)",
    nativeLabel: "简体中文",
    region: "Asia",
    dir: "ltr",
    countryNames: ["China", "Singapore"],
    fontFamilyDisplay: "'Noto Serif SC', 'ZCOOL XiaoWei', serif",
    fontFamilyBody: "'Noto Serif SC', sans-serif",
    googleFontQuery: "family=Noto+Serif+SC:wght@400;600;700&family=ZCOOL+XiaoWei",
  },
  {
    code: "zh-TW",
    label: "Chinese (Traditional)",
    nativeLabel: "繁體中文",
    region: "Asia",
    dir: "ltr",
    countryNames: ["Taiwan", "Hong Kong", "Macau"],
    fontFamilyDisplay: "'Noto Serif TC', serif",
    fontFamilyBody: "'Noto Serif TC', sans-serif",
    googleFontQuery: "family=Noto+Serif+TC:wght@400;600;700",
  },
  {
    code: "ar",
    label: "Arabic",
    nativeLabel: "العربية",
    region: "Middle East",
    dir: "rtl",
    countryNames: ["United Arab Emirates", "Saudi Arabia", "Qatar", "Kuwait", "Egypt", "Oman", "Bahrain"],
    fontFamilyDisplay: "'Amiri', 'Cairo', serif",
    fontFamilyBody: "'Cairo', 'Amiri', sans-serif",
    googleFontQuery: "family=Amiri:ital,wght@0,400;0,700;1,400&family=Cairo:wght@400;600;700",
  },
  {
    code: "ur",
    label: "Urdu",
    nativeLabel: "اردو",
    region: "Asia",
    dir: "rtl",
    countryNames: ["Pakistan", "India"],
    fontFamilyDisplay: "'Noto Naskh Arabic', 'Amiri', serif",
    fontFamilyBody: "'Noto Naskh Arabic', sans-serif",
    googleFontQuery: "family=Noto+Naskh+Arabic:wght@400;600;700&family=Amiri:wght@400;700",
  },
  {
    code: "fa",
    label: "Persian (Farsi)",
    nativeLabel: "فارسی",
    region: "Middle East",
    dir: "rtl",
    countryNames: ["Iran", "Afghanistan"],
    fontFamilyDisplay: "'Vazirmatn', 'Amiri', serif",
    fontFamilyBody: "'Vazirmatn', sans-serif",
    googleFontQuery: "family=Vazirmatn:wght@400;600;700&family=Amiri:wght@400;700",
  },
  {
    code: "vi",
    label: "Vietnamese",
    nativeLabel: "Tiếng Việt",
    region: "Asia",
    dir: "ltr",
    countryNames: ["Vietnam"],
    fontFamilyDisplay: "'Be Vietnam Pro', 'Cinzel', serif",
    fontFamilyBody: "'Be Vietnam Pro', sans-serif",
    googleFontQuery: "family=Be+Vietnam+Pro:wght@400;500;600;700",
  },
  {
    code: "th",
    label: "Thai",
    nativeLabel: "ไทย",
    region: "Asia",
    dir: "ltr",
    countryNames: ["Thailand"],
    fontFamilyDisplay: "'Noto Serif Thai', 'Prompt', serif",
    fontFamilyBody: "'Prompt', 'Noto Serif Thai', sans-serif",
    googleFontQuery: "family=Noto+Serif+Thai:wght@400;600;700&family=Prompt:wght@400;500;600",
  },
  {
    code: "id",
    label: "Indonesian",
    nativeLabel: "Bahasa Indonesia",
    region: "Asia",
    dir: "ltr",
    countryNames: ["Indonesia"],
    fontFamilyDisplay: "'Instrument Serif', 'Cinzel', serif",
    fontFamilyBody: "'Plus Jakarta Sans', sans-serif",
  },
  {
    code: "ms",
    label: "Malay",
    nativeLabel: "Bahasa Melayu",
    region: "Asia",
    dir: "ltr",
    countryNames: ["Malaysia", "Brunei"],
    fontFamilyDisplay: "'Instrument Serif', 'Cinzel', serif",
    fontFamilyBody: "'Plus Jakarta Sans', sans-serif",
  },
  {
    code: "tl",
    label: "Filipino (Tagalog)",
    nativeLabel: "Tagalog",
    region: "Asia",
    dir: "ltr",
    countryNames: ["Philippines"],
    fontFamilyDisplay: "'Instrument Serif', 'Cinzel', serif",
    fontFamilyBody: "'Plus Jakarta Sans', sans-serif",
  },
  {
    code: "ta",
    label: "Tamil",
    nativeLabel: "தமிழ்",
    region: "Asia",
    dir: "ltr",
    countryNames: ["India", "Sri Lanka", "Singapore"],
    fontFamilyDisplay: "'Noto Serif Tamil', serif",
    fontFamilyBody: "'Noto Serif Tamil', sans-serif",
    googleFontQuery: "family=Noto+Serif+Tamil:wght@400;600;700",
  },
  {
    code: "te",
    label: "Telugu",
    nativeLabel: "తెలుగు",
    region: "Asia",
    dir: "ltr",
    countryNames: ["India"],
    fontFamilyDisplay: "'Noto Serif Telugu', serif",
    fontFamilyBody: "'Noto Serif Telugu', sans-serif",
    googleFontQuery: "family=Noto+Serif+Telugu:wght@400;600;700",
  },
  {
    code: "mr",
    label: "Marathi",
    nativeLabel: "मराठी",
    region: "Asia",
    dir: "ltr",
    countryNames: ["India"],
    fontFamilyDisplay: "'Noto Serif Devanagari', serif",
    fontFamilyBody: "'Noto Serif Devanagari', sans-serif",
    googleFontQuery: "family=Noto+Serif+Devanagari:wght@400;600;700",
  },
  {
    code: "gu",
    label: "Gujarati",
    nativeLabel: "ગુજરાતી",
    region: "Asia",
    dir: "ltr",
    countryNames: ["India"],
    fontFamilyDisplay: "'Noto Serif Gujarati', serif",
    fontFamilyBody: "'Noto Serif Gujarati', sans-serif",
    googleFontQuery: "family=Noto+Serif+Gujarati:wght@400;600;700",
  },
  {
    code: "pa",
    label: "Punjabi",
    nativeLabel: "ਪੰਜਾਬੀ",
    region: "Asia",
    dir: "ltr",
    countryNames: ["India", "Pakistan"],
    fontFamilyDisplay: "'Noto Serif Gurmukhi', serif",
    fontFamilyBody: "'Noto Serif Gurmukhi', sans-serif",
    googleFontQuery: "family=Noto+Serif+Gurmukhi:wght@400;600;700",
  },
  {
    code: "ne",
    label: "Nepali",
    nativeLabel: "नेपाली",
    region: "Asia",
    dir: "ltr",
    countryNames: ["Nepal"],
    fontFamilyDisplay: "'Noto Serif Devanagari', serif",
    fontFamilyBody: "'Noto Serif Devanagari', sans-serif",
    googleFontQuery: "family=Noto+Serif+Devanagari:wght@400;600;700",
  },
  {
    code: "si",
    label: "Sinhala",
    nativeLabel: "සිංහල",
    region: "Asia",
    dir: "ltr",
    countryNames: ["Sri Lanka"],
    fontFamilyDisplay: "'Noto Serif Sinhala', serif",
    fontFamilyBody: "'Noto Serif Sinhala', sans-serif",
    googleFontQuery: "family=Noto+Serif+Sinhala:wght@400;600;700",
  },
  {
    code: "my",
    label: "Burmese",
    nativeLabel: "မြန်မာစာ",
    region: "Asia",
    dir: "ltr",
    countryNames: ["Myanmar"],
    fontFamilyDisplay: "'Noto Serif Myanmar', serif",
    fontFamilyBody: "'Noto Serif Myanmar', sans-serif",
    googleFontQuery: "family=Noto+Serif+Myanmar:wght@400;600;700",
  },
  {
    code: "km",
    label: "Khmer",
    nativeLabel: "ភាសាខ្មែរ",
    region: "Asia",
    dir: "ltr",
    countryNames: ["Cambodia"],
    fontFamilyDisplay: "'Noto Serif Khmer', serif",
    fontFamilyBody: "'Noto Serif Khmer', sans-serif",
    googleFontQuery: "family=Noto+Serif+Khmer:wght@400;600;700",
  },
  {
    code: "uz",
    label: "Uzbek",
    nativeLabel: "Oʻzbekcha",
    region: "Asia",
    dir: "ltr",
    countryNames: ["Uzbekistan"],
    fontFamilyDisplay: "'Cinzel', 'Playfair Display', serif",
    fontFamilyBody: "'Plus Jakarta Sans', sans-serif",
  },
  {
    code: "kk",
    label: "Kazakh",
    nativeLabel: "Қазақша",
    region: "Asia",
    dir: "ltr",
    countryNames: ["Kazakhstan"],
    fontFamilyDisplay: "'Cinzel', 'Playfair Display', serif",
    fontFamilyBody: "'Montserrat', sans-serif",
    googleFontQuery: "family=Playfair+Display:wght@500;700&family=Montserrat:wght@400;600",
  },

  // ── EUROPEAN LANGUAGES ──
  {
    code: "fr",
    label: "French",
    nativeLabel: "Français",
    region: "Europe",
    dir: "ltr",
    countryNames: ["France", "Belgium", "Switzerland", "Monaco", "Luxembourg"],
    fontFamilyDisplay: "'Cinzel', 'Playfair Display', serif",
    fontFamilyBody: "'Plus Jakarta Sans', sans-serif",
  },
  {
    code: "de",
    label: "German",
    nativeLabel: "Deutsch",
    region: "Europe",
    dir: "ltr",
    countryNames: ["Germany", "Austria", "Switzerland", "Liechtenstein"],
    fontFamilyDisplay: "'Cinzel', 'Playfair Display', serif",
    fontFamilyBody: "'Plus Jakarta Sans', sans-serif",
  },
  {
    code: "es",
    label: "Spanish",
    nativeLabel: "Español",
    region: "Europe",
    dir: "ltr",
    countryNames: ["Spain", "Mexico", "Argentina", "Colombia", "Chile", "Peru"],
    fontFamilyDisplay: "'Cinzel', 'Playfair Display', serif",
    fontFamilyBody: "'Plus Jakarta Sans', sans-serif",
  },
  {
    code: "it",
    label: "Italian",
    nativeLabel: "Italiano",
    region: "Europe",
    dir: "ltr",
    countryNames: ["Italy", "Switzerland", "San Marino", "Vatican City"],
    fontFamilyDisplay: "'Cinzel', 'Playfair Display', serif",
    fontFamilyBody: "'Plus Jakarta Sans', sans-serif",
  },
  {
    code: "pt",
    label: "Portuguese",
    nativeLabel: "Português",
    region: "Europe",
    dir: "ltr",
    countryNames: ["Portugal", "Brazil"],
    fontFamilyDisplay: "'Cinzel', 'Playfair Display', serif",
    fontFamilyBody: "'Plus Jakarta Sans', sans-serif",
  },
  {
    code: "ru",
    label: "Russian",
    nativeLabel: "Русский",
    region: "Europe",
    dir: "ltr",
    countryNames: ["Russia", "Belarus"],
    fontFamilyDisplay: "'Playfair Display', 'Cinzel', serif",
    fontFamilyBody: "'Montserrat', sans-serif",
    googleFontQuery: "family=Playfair+Display:wght@500;700&family=Montserrat:wght@400;600",
  },
  {
    code: "nl",
    label: "Dutch",
    nativeLabel: "Nederlands",
    region: "Europe",
    dir: "ltr",
    countryNames: ["Netherlands", "Belgium", "Suriname"],
    fontFamilyDisplay: "'Cinzel', 'Playfair Display', serif",
    fontFamilyBody: "'Plus Jakarta Sans', sans-serif",
  },
  {
    code: "pl",
    label: "Polish",
    nativeLabel: "Polski",
    region: "Europe",
    dir: "ltr",
    countryNames: ["Poland"],
    fontFamilyDisplay: "'Cinzel', 'Playfair Display', serif",
    fontFamilyBody: "'Plus Jakarta Sans', sans-serif",
  },
  {
    code: "sv",
    label: "Swedish",
    nativeLabel: "Svenska",
    region: "Europe",
    dir: "ltr",
    countryNames: ["Sweden", "Finland"],
    fontFamilyDisplay: "'Cinzel', 'Playfair Display', serif",
    fontFamilyBody: "'Plus Jakarta Sans', sans-serif",
  },
  {
    code: "no",
    label: "Norwegian",
    nativeLabel: "Norsk",
    region: "Europe",
    dir: "ltr",
    countryNames: ["Norway"],
    fontFamilyDisplay: "'Cinzel', 'Playfair Display', serif",
    fontFamilyBody: "'Plus Jakarta Sans', sans-serif",
  },
  {
    code: "da",
    label: "Danish",
    nativeLabel: "Dansk",
    region: "Europe",
    dir: "ltr",
    countryNames: ["Denmark"],
    fontFamilyDisplay: "'Cinzel', 'Playfair Display', serif",
    fontFamilyBody: "'Plus Jakarta Sans', sans-serif",
  },
  {
    code: "fi",
    label: "Finnish",
    nativeLabel: "Suomi",
    region: "Europe",
    dir: "ltr",
    countryNames: ["Finland"],
    fontFamilyDisplay: "'Cinzel', 'Playfair Display', serif",
    fontFamilyBody: "'Plus Jakarta Sans', sans-serif",
  },
  {
    code: "el",
    label: "Greek",
    nativeLabel: "Ελληνικά",
    region: "Europe",
    dir: "ltr",
    countryNames: ["Greece", "Cyprus"],
    fontFamilyDisplay: "'GFS Didot', 'Noto Serif Greek', serif",
    fontFamilyBody: "'Noto Serif Greek', sans-serif",
    googleFontQuery: "family=GFS+Didot&family=Noto+Serif+Greek:wght@400;600;700",
  },
  {
    code: "tr",
    label: "Turkish",
    nativeLabel: "Türkçe",
    region: "Europe",
    dir: "ltr",
    countryNames: ["Turkey", "Cyprus"],
    fontFamilyDisplay: "'Cinzel', 'Playfair Display', serif",
    fontFamilyBody: "'Plus Jakarta Sans', sans-serif",
  },
  {
    code: "cs",
    label: "Czech",
    nativeLabel: "Čeština",
    region: "Europe",
    dir: "ltr",
    countryNames: ["Czech Republic"],
    fontFamilyDisplay: "'Cinzel', 'Playfair Display', serif",
    fontFamilyBody: "'Plus Jakarta Sans', sans-serif",
  },
  {
    code: "ro",
    label: "Romanian",
    nativeLabel: "Română",
    region: "Europe",
    dir: "ltr",
    countryNames: ["Romania", "Moldova"],
    fontFamilyDisplay: "'Cinzel', 'Playfair Display', serif",
    fontFamilyBody: "'Plus Jakarta Sans', sans-serif",
  },
  {
    code: "hu",
    label: "Hungarian",
    nativeLabel: "Magyar",
    region: "Europe",
    dir: "ltr",
    countryNames: ["Hungary"],
    fontFamilyDisplay: "'Cinzel', 'Playfair Display', serif",
    fontFamilyBody: "'Plus Jakarta Sans', sans-serif",
  },
  {
    code: "uk",
    label: "Ukrainian",
    nativeLabel: "Українська",
    region: "Europe",
    dir: "ltr",
    countryNames: ["Ukraine"],
    fontFamilyDisplay: "'Playfair Display', 'Cinzel', serif",
    fontFamilyBody: "'Montserrat', sans-serif",
    googleFontQuery: "family=Playfair+Display:wght@500;700&family=Montserrat:wght@400;600",
  },
  {
    code: "bg",
    label: "Bulgarian",
    nativeLabel: "Български",
    region: "Europe",
    dir: "ltr",
    countryNames: ["Bulgaria"],
    fontFamilyDisplay: "'Playfair Display', 'Cinzel', serif",
    fontFamilyBody: "'Montserrat', sans-serif",
    googleFontQuery: "family=Playfair+Display:wght@500;700&family=Montserrat:wght@400;600",
  },
  {
    code: "hr",
    label: "Croatian",
    nativeLabel: "Hrvatski",
    region: "Europe",
    dir: "ltr",
    countryNames: ["Croatia", "Bosnia and Herzegovina"],
    fontFamilyDisplay: "'Cinzel', 'Playfair Display', serif",
    fontFamilyBody: "'Plus Jakarta Sans', sans-serif",
  },
  {
    code: "sr",
    label: "Serbian",
    nativeLabel: "Српски",
    region: "Europe",
    dir: "ltr",
    countryNames: ["Serbia", "Montenegro", "Bosnia and Herzegovina"],
    fontFamilyDisplay: "'Playfair Display', 'Cinzel', serif",
    fontFamilyBody: "'Montserrat', sans-serif",
    googleFontQuery: "family=Playfair+Display:wght@500;700&family=Montserrat:wght@400;600",
  },
  {
    code: "sk",
    label: "Slovak",
    nativeLabel: "Slovenčina",
    region: "Europe",
    dir: "ltr",
    countryNames: ["Slovakia"],
    fontFamilyDisplay: "'Cinzel', 'Playfair Display', serif",
    fontFamilyBody: "'Plus Jakarta Sans', sans-serif",
  },
  {
    code: "lt",
    label: "Lithuanian",
    nativeLabel: "Lietuvių",
    region: "Europe",
    dir: "ltr",
    countryNames: ["Lithuania"],
    fontFamilyDisplay: "'Cinzel', 'Playfair Display', serif",
    fontFamilyBody: "'Plus Jakarta Sans', sans-serif",
  },
  {
    code: "lv",
    label: "Latvian",
    nativeLabel: "Latviešu",
    region: "Europe",
    dir: "ltr",
    countryNames: ["Latvia"],
    fontFamilyDisplay: "'Cinzel', 'Playfair Display', serif",
    fontFamilyBody: "'Plus Jakarta Sans', sans-serif",
  },
  {
    code: "et",
    label: "Estonian",
    nativeLabel: "Eesti",
    region: "Europe",
    dir: "ltr",
    countryNames: ["Estonia"],
    fontFamilyDisplay: "'Cinzel', 'Playfair Display', serif",
    fontFamilyBody: "'Plus Jakarta Sans', sans-serif",
  },
  {
    code: "sl",
    label: "Slovenian",
    nativeLabel: "Slovenščina",
    region: "Europe",
    dir: "ltr",
    countryNames: ["Slovenia"],
    fontFamilyDisplay: "'Cinzel', 'Playfair Display', serif",
    fontFamilyBody: "'Plus Jakarta Sans', sans-serif",
  },
  {
    code: "ga",
    label: "Irish",
    nativeLabel: "Gaeilge",
    region: "Europe",
    dir: "ltr",
    countryNames: ["Ireland"],
    fontFamilyDisplay: "'Cinzel', 'Playfair Display', serif",
    fontFamilyBody: "'Plus Jakarta Sans', sans-serif",
  },
  {
    code: "is",
    label: "Icelandic",
    nativeLabel: "Íslenska",
    region: "Europe",
    dir: "ltr",
    countryNames: ["Iceland"],
    fontFamilyDisplay: "'Cinzel', 'Playfair Display', serif",
    fontFamilyBody: "'Plus Jakarta Sans', sans-serif",
  },
];

// UI translation fallback strings
const EN_STRINGS: Record<string, string> = {
  "nav.home": "Home",
  "nav.shop": "Shop",
  "nav.cart": "Cart",
  "nav.wishlist": "Wishlist",
  "nav.orders": "Orders",
  "nav.profile": "Profile",
  "nav.settings": "Settings",
  "nav.signIn": "Sign In",
  "nav.signOut": "Sign Out",
  "nav.search": "Search products...",
  "nav.categories": "Categories",
  "nav.support": "Support",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.add": "Add",
  "common.loading": "Loading...",
  "common.noResults": "No results found",
  "common.viewAll": "View All",
  "common.addToCart": "Add to Cart",
  "common.buyNow": "Buy Now",
  "common.outOfStock": "Out of Stock",
  "common.inStock": "In Stock",
  "common.price": "Price",
  "common.quantity": "Quantity",
  "common.total": "Total",
  "common.search": "Search",
  "common.back": "Back",
  "common.next": "Next",
  "common.submit": "Submit",
  "common.confirm": "Confirm",
  "common.close": "Close",
  "common.share": "Share",
  "common.review": "Review",
  "common.reviews": "Reviews",
  "common.description": "Description",
  "common.specifications": "Specifications",
  "common.relatedProducts": "Related Products",
  "settings.appearance": "Appearance",
  "settings.notifications": "Notifications",
  "settings.security": "Security",
  "settings.general": "General",
  "settings.language": "Language",
  "settings.currency": "Currency",
  "settings.darkMode": "Dark Mode",
  "profile.personalInfo": "Personal Information",
  "profile.addresses": "Addresses",
  "profile.payments": "Payments",
  "profile.reviews": "Reviews",
  "profile.myOrders": "My Orders",
  "profile.editProfile": "Edit Profile",
  "checkout.address": "Shipping Address",
  "checkout.payment": "Payment Method",
  "checkout.review": "Review Order",
  "checkout.placeOrder": "Place Order",
  "checkout.subtotal": "Subtotal",
  "checkout.shipping": "Shipping",
  "checkout.discount": "Discount",
  "checkout.orderTotal": "Order Total",
  "checkout.orderPlaced": "Order Placed!",
  "cart.empty": "Your cart is empty",
  "cart.continueShopping": "Continue Shopping",
  "cart.checkout": "Checkout",
  "wishlist.empty": "Your wishlist is empty",
  "wishlist.addedToCart": "Added to cart",
  "order.pending": "Pending",
  "order.processing": "Processing",
  "order.shipped": "Shipped",
  "order.delivered": "Delivered",
  "order.cancelled": "Cancelled",
  "order.trackOrder": "Track Order",
  "footer.subscribe": "Subscribe",
  "footer.privacyPolicy": "Privacy Policy",
  "footer.termsOfService": "Terms of Service",
  "footer.stayAhead": "Stay ahead",
  "footer.getLatest": "Get the latest drops",
  "home.featured": "Featured Products",
  "home.newArrivals": "New Arrivals",
  "home.shopNow": "Shop Now",
  "home.trending": "Trending Now",
  "home.deals": "Today's Deals",
  "shop.filters": "Filters",
  "shop.sortBy": "Sort by",
  "shop.allCategories": "All Categories",
  "shop.noProducts": "No products found",
  "product.addReview": "Write a Review",
  "product.relatedProducts": "You May Also Like",
  "product.shareProduct": "Share this product",
  "support.aiAssistant": "AI-powered support assistant",
  "support.typeQuestion": "Type your question...",
  "support.liveCalling": "Voice Call Active",
  "support.incomingCall": "Incoming Voice Call",
  "support.callDescription": "Customer support wants to speak with you",
  "orders.noOrders": "No orders yet",
  "orders.orderHistory": "Order History",
  "profile.savedAddresses": "Saved Addresses",
  "profile.accountSettings": "Account Settings",
  "profile.account": "Account",
  "profile.rewardsLoyalty": "Rewards & loyalty",
  "profile.myReviews": "My reviews",
  "profile.callHistory": "Call history",
  "profile.groupAccount": "Account",
  "profile.groupActivity": "Activity",
  "nav.notifications": "Notifications",
  "newsletter.tagline": "Stay in the loop",
  "newsletter.title": "Be the first to know about every drop.",
  "newsletter.desc": "No noise. No spam. Just the latest releases, restocks, and exclusive access — straight to your inbox.",
  "newsletter.button": "Join",
  "newsletter.success": "You're on the list. Watch your inbox.",
  "newsletter.disclaimer": "Unsubscribe anytime. No hard feelings.",
};

// Handcrafted luxury translations designed to feel natively created
const TRANSLATIONS: Record<string, Record<string, string>> = {
  bn: {
    "nav.home": "হোম", "nav.shop": "সংগ্রহশালা", "nav.cart": "ব্যাগ", "nav.wishlist": "পছন্দের তালিকা",
    "nav.orders": "অর্ডারসমূহ", "nav.profile": "প্রোফাইল", "nav.settings": "সেটিংস",
    "nav.signIn": "সাইন ইন", "nav.signOut": "সাইন আউট", "nav.search": "অভিজাত পণ্য খুঁজুন...",
    "nav.categories": "ক্যাটাগরি", "nav.support": "কনসিয়ার্জ সাপোর্ট",
    "common.save": "সংরক্ষণ", "common.cancel": "বাতিল", "common.delete": "মুছুন",
    "common.edit": "সম্পাদনা", "common.add": "যোগ করুন", "common.loading": "লোড হচ্ছে...",
    "common.addToCart": "ব্যাগে রাখুন", "common.buyNow": "সরাসরি অর্ডার",
    "common.outOfStock": "স্টক শেষ", "common.inStock": "স্টকে রয়েছে",
    "common.noResults": "কোনো পণ্য খুঁজে পাওয়া যায়নি", "common.viewAll": "সম্পূর্ণ দেখুন",
    "common.price": "মূল্য", "common.quantity": "পরিমাণ", "common.total": "সর্বমোট",
    "common.search": "অনুসন্ধান", "common.back": "পূর্ববর্তী", "common.next": "পরবর্তী",
    "common.submit": "সম্পন্ন করুন", "common.confirm": "নিশ্চিত করুন", "common.close": "বন্ধ",
    "common.review": "মতামত", "common.reviews": "গ্রাহক মতামত",
    "common.description": "বিবরণ ও কারুশিল্প", "common.specifications": "বিশদ বিবরণ",
    "settings.appearance": "আভিজাত্য ও থিম", "settings.notifications": "বিজ্ঞপ্তি",
    "settings.security": "নিরাপত্তা", "settings.general": "সাধারণ",
    "settings.language": "ভাষা", "settings.currency": "মুদ্রা", "settings.darkMode": "ডার্ক মোড",
    "profile.personalInfo": "ব্যক্তিগত তথ্য", "profile.addresses": "শিপিং ঠিকানা",
    "profile.payments": "পেমেন্ট পদ্ধতি", "profile.reviews": "আমার মতামত",
    "profile.myOrders": "অর্ডার হিস্ট্রি", "profile.editProfile": "প্রোফাইল সম্পাদনা",
    "checkout.address": "শিপিং ঠিকানা", "checkout.payment": "পেমেন্ট মেথড",
    "checkout.review": "অর্ডার পর্যালোচনা", "checkout.placeOrder": "অর্ডার কনফার্ম করুন",
    "checkout.subtotal": "সাবটোটাল", "checkout.shipping": "শিপিং খরচ",
    "checkout.discount": "বিশেষ সুবিধা/ছাড়", "checkout.orderTotal": "সর্বমোট প্রদেয়",
    "cart.empty": "আপনার শপিং ব্যাগটি খালি রয়েছে", "cart.continueShopping": "সংগ্রহে চোখ বুলান",
    "cart.checkout": "চেকআউট করুন",
    "wishlist.empty": "পছন্দের তালিকায় কিছু নেই",
    "order.pending": "প্রক্রিয়াধীন", "order.processing": "প্রস্তুত হচ্ছে",
    "order.shipped": "শিপমেন্ট সম্পন্ন", "order.delivered": "বিতরণ সম্পন্ন",
    "order.cancelled": "বাতিলকৃত", "order.trackOrder": "অর্ডার ট্র্যাক করুন",
    "footer.subscribe": "সাবস্ক্রাইব", "footer.stayAhead": "আভিজাত্যে অগ্রগামী থাকুন",
    "footer.getLatest": "নতুন কালেকশন ও প্রাইভেট ড্রপ পান",
    "newsletter.tagline": "সংযুক্ত থাকুন",
    "newsletter.title": "নতুন প্রতিটি ড্রপ ও রিলিজের খবর সবার আগে জানুন।",
    "newsletter.desc": "কোনো স্প্যাম নয়। শুধু নতুন কালেকশন ড্রপ, রিস্টক ও প্রাইভেট অ্যাক্সেস সরাসরি আপনার ইনবক্সে।",
    "newsletter.button": "যুক্ত হন",
    "newsletter.success": "আপনি তালিকায় যুক্ত হয়েছেন। ইনবক্সে লক্ষ্য রাখুন।",
    "newsletter.disclaimer": "যেকোনো সময় আনসাবস্ক্রাইব করতে পারেন।",
    "home.featured": "নির্বাচিত সৃষ্টিসমূহ", "home.newArrivals": "নতুন আগমনী সম্ভার",
    "home.shopNow": "সংগ্রহ দেখুন", "home.trending": "চলতি ট্রেন্ড",
    "home.deals": "বিশেষ সংস্করণ",
    "shop.filters": "ফিল্টার", "shop.sortBy": "সাজান",
    "shop.allCategories": "সকল ক্যাটাগরি", "shop.noProducts": "কোনো পণ্য পাওয়া যায়নি",
    "product.addReview": "মতামত লিখুন", "product.relatedProducts": "আপনার পছন্দের সম্ভাব্য তালিকা",
    "support.aiAssistant": "ডিজিটাল কনসিয়ার্জ", "support.typeQuestion": "আপনার অনুসন্ধান লিখুন...",
    "orders.noOrders": "এখনো কোনো অর্ডার নেই", "orders.orderHistory": "অর্ডারের ইতিহাস",
    "profile.savedAddresses": "সংরক্ষিত ঠিকানা", "profile.accountSettings": "অ্যাকাউন্ট সেটিংস",
    "profile.account": "অ্যাকাউন্ট", "profile.rewardsLoyalty": "রিওয়ার্ড ও সম্মাননা",
    "profile.myReviews": "আমার রিভিউসমূহ", "profile.callHistory": "কল হিস্ট্রি",
    "profile.groupAccount": "অ্যাকাউন্ট", "profile.groupActivity": "কার্যকলাপ",
    "nav.notifications": "নোটিফিকেশন",
  },
  ja: {
    "nav.home": "ホーム", "nav.shop": "コレクション", "nav.cart": "バッグ", "nav.wishlist": "ウィッシュリスト",
    "nav.orders": "ご注文履歴", "nav.profile": "マイページ", "nav.settings": "設定",
    "nav.signIn": "ログイン", "nav.signOut": "ログアウト", "nav.search": "商品を検索...",
    "nav.categories": "カテゴリー", "nav.support": "コンシェルジュ",
    "common.save": "保存", "common.cancel": "キャンセル", "common.delete": "削除",
    "common.addToCart": "バッグに追加", "common.buyNow": "今すぐ購入",
    "common.outOfStock": "完売", "common.inStock": "在庫あり",
    "common.viewAll": "すべて見る", "common.loading": "読み込み中...",
    "common.price": "価格", "common.total": "合計",
    "settings.language": "言語", "settings.currency": "通貨",
    "checkout.placeOrder": "注文を確定する", "checkout.subtotal": "小計",
    "cart.empty": "ショッピングバッグは空です", "cart.checkout": "お会計へ進む",
    "home.featured": "厳選された名品", "home.newArrivals": "新作コレクション",
    "home.shopNow": "コレクションを見る", "home.trending": "注目のスタイル",
    "footer.stayAhead": "最新のクリエイションをお届け",
    "footer.getLatest": "限定コレクションや先行情報を受信",
    "support.aiAssistant": "ORIZINO デジタルコンシェルジュ",
  },
  fr: {
    "nav.home": "Accueil", "nav.shop": "Boutique", "nav.cart": "Panier", "nav.wishlist": "Coups de Cœur",
    "nav.orders": "Commandes", "nav.profile": "Profil", "nav.settings": "Paramètres",
    "nav.signIn": "Connexion", "nav.signOut": "Déconnexion", "nav.search": "Rechercher une pièce...",
    "nav.categories": "Catégories", "nav.support": "Conciergerie",
    "common.addToCart": "Ajouter au Panier", "common.buyNow": "Commander Immédiatement",
    "common.outOfStock": "Épuisé", "common.inStock": "Disponible",
    "home.featured": "Pièces d'Exception", "home.newArrivals": "Nouvelle Collection",
    "home.shopNow": "Découvrir la Collection", "home.trending": "Tendances Actuelles",
    "footer.stayAhead": "Restez à la pointe de l'élégance",
    "footer.getLatest": "Recevez nos invitations privées",
    "support.aiAssistant": "Concierge Numérique ORIZINO",
  },
  de: {
    "nav.home": "Startseite", "nav.shop": "Kollektion", "nav.cart": "Warenkorb", "nav.wishlist": "Wunschliste",
    "nav.orders": "Bestellungen", "nav.profile": "Konto", "nav.settings": "Einstellungen",
    "nav.signIn": "Anmelden", "nav.signOut": "Abmelden", "nav.search": "Produkte suchen...",
    "common.addToCart": "In den Warenkorb", "common.buyNow": "Sofort Kaufen",
    "home.featured": "Exklusive Auslese", "home.newArrivals": "Neuheiten",
    "home.shopNow": "Kollektion Entdecken", "home.trending": "Trends der Saison",
    "footer.stayAhead": "Exklusivität erleben",
    "support.aiAssistant": "ORIZINO Digital Concierge",
  },
  es: {
    "nav.home": "Inicio", "nav.shop": "Colección", "nav.cart": "Bolsa", "nav.wishlist": "Deseos",
    "nav.orders": "Pedidos", "nav.profile": "Perfil", "nav.settings": "Ajustes",
    "nav.signIn": "Iniciar Sesión", "nav.signOut": "Cerrar Sesión", "nav.search": "Buscar productos...",
    "common.addToCart": "Añadir a la Bolsa", "common.buyNow": "Comprar Ahora",
    "home.featured": "Selección Exclusiva", "home.newArrivals": "Novedades",
    "home.shopNow": "Explorar Colección", "home.trending": "Tendencias",
    "footer.stayAhead": "Manténgase a la vanguardia",
    "support.aiAssistant": "Conserje Digital ORIZINO",
  },
  it: {
    "nav.home": "Home", "nav.shop": "Collezione", "nav.cart": "Carrello", "nav.wishlist": "Preferiti",
    "nav.orders": "Ordini", "nav.profile": "Profilo", "nav.settings": "Impostazioni",
    "common.addToCart": "Aggiungi al Carrello", "common.buyNow": "Acquista Ora",
    "home.featured": "Pezzi Esclusivi", "home.newArrivals": "Nuovi Arrivi",
    "home.shopNow": "Scopri la Collezione", "home.trending": "Tendenze",
    "footer.stayAhead": "L'eccellenza in anteprima",
    "support.aiAssistant": "Concierge Digitale ORIZINO",
  },
  ar: {
    "nav.home": "الرئيسية", "nav.shop": "المجموعة", "nav.cart": "الحقيبة", "nav.wishlist": "قائمة الرغبات",
    "nav.orders": "الطلبات", "nav.profile": "الحساب", "nav.settings": "الإعدادات",
    "common.addToCart": "أضف إلى الحقيبة", "common.buyNow": "شراء فوري",
    "home.featured": "إبداعات مختارة", "home.newArrivals": "أحدث التشكيلات",
    "home.shopNow": "استكشف المجموعة", "home.trending": "الأكثر رواجاً",
    "footer.stayAhead": "ابقَ في طليعة الأناقة",
    "support.aiAssistant": "المساعد الرقمي الفاخر",
  },
  ko: {
    "nav.home": "홈", "nav.shop": "컬렉션", "nav.cart": "쇼핑백", "nav.wishlist": "위시리스트",
    "nav.orders": "주문 내역", "nav.profile": "마이페이지", "nav.settings": "설정",
    "common.addToCart": "쇼핑백 담기", "common.buyNow": "바로 구매",
    "home.featured": "시그니처 에디션", "home.newArrivals": "신규 컬렉션",
    "home.shopNow": "컬렉션 보기", "home.trending": "트렌딩",
    "support.aiAssistant": "ORIZINO 디지털 컨시어지",
  },
  zh: {
    "nav.home": "首页", "nav.shop": "臻品甄选", "nav.cart": "购物袋", "nav.wishlist": "心愿单",
    "nav.orders": "订单记录", "nav.profile": "个人中心", "nav.settings": "设置",
    "common.addToCart": "加入购物袋", "common.buyNow": "立即购买",
    "home.featured": "典藏臻选", "home.newArrivals": "当季新品",
    "home.shopNow": "探索全系列", "home.trending": "风尚精选",
    "support.aiAssistant": "ORIZINO 数字化贵宾顾问",
  },
};

interface LanguageContextType {
  language: string;
  setLanguage: (code: string) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
  allLanguages: LangDef[];
  detectedCountry: string | null;
  detectedLang: LangDef | null;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key) => key,
  dir: "ltr",
  allLanguages: ALL_LANGUAGES,
  detectedCountry: null,
  detectedLang: null,
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState("en");
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const [detectedLang, setDetectedLang] = useState<LangDef | null>(null);
  const { user } = useAuth();

  // Helper to load Google Fonts silently for the active language
  const loadFontForLanguage = useCallback((code: string) => {
    if (typeof document === "undefined") return;
    const langObj = ALL_LANGUAGES.find((l) => l.code === code);
    if (!langObj) return;

    // Load Google Font stylesheet link if present
    if (langObj.googleFontQuery) {
      const linkId = `orizino-font-${code}`;
      if (!document.getElementById(linkId)) {
        const link = document.createElement("link");
        link.id = linkId;
        link.rel = "stylesheet";
        link.href = `https://fonts.googleapis.com/css2?${langObj.googleFontQuery}&display=swap`;
        document.head.appendChild(link);
      }
    }

    // Inject/Update dynamic CSS typography variables on html element
    const styleId = "orizino-language-typography";
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    const displayFont = langObj.fontFamilyDisplay || "'Instrument Serif', 'Cinzel', serif";
    const bodyFont = langObj.fontFamilyBody || "'Plus Jakarta Sans', sans-serif";

    styleEl.innerHTML = `
      :root {
        --lang-font-display: ${displayFont};
        --lang-font-body: ${bodyFont};
      }
      html[lang="${code}"],
      html[lang="${code}"] body,
      html[lang="${code}"] p,
      html[lang="${code}"] span,
      html[lang="${code}"] a,
      html[lang="${code}"] button,
      html[lang="${code}"] input,
      html[lang="${code}"] textarea,
      html[lang="${code}"] select,
      html[lang="${code}"] .font-sans-brand,
      html[lang="${code}"] .font-body,
      html[lang="${code}"] .font-sans,
      html[lang="${code}"] [class*="font-sans"] {
        font-family: var(--lang-font-body), 'DM Sans', 'Inter', sans-serif !important;
      }
      html[lang="${code}"] .font-display,
      html[lang="${code}"] .font-serif,
      html[lang="${code}"] .heading-editorial,
      html[lang="${code}"] h1,
      html[lang="${code}"] h2,
      html[lang="${code}"] h3,
      html[lang="${code}"] h4,
      html[lang="${code}"] h5,
      html[lang="${code}"] h6,
      html[lang="${code}"] .brand-heading,
      html[lang="${code}"] [class*="heading-"] {
        font-family: var(--lang-font-display), var(--lang-font-body), 'Playfair Display', serif !important;
      }
      /* Suppress text highlight flash and artifacts from Google Translate */
      .goog-text-highlight,
      .goog-text-highlight:hover,
      .goog-text-highlight:focus {
        background: transparent !important;
        background-color: transparent !important;
        box-shadow: none !important;
        text-shadow: none !important;
        outline: none !important;
        border: none !important;
        color: inherit !important;
        display: inline !important;
        font-style: inherit !important;
        font-family: inherit !important;
      }
      font[style],
      font {
        background: transparent !important;
        background-color: transparent !important;
        color: inherit !important;
        box-shadow: none !important;
      }
      /* Strict Non-Translation Rules: Protect Brand name, & Co., short forms, AI chats, currency, SKU, sizes */
      .notranslate,
      .skiptranslate,
      [translate="no"],
      .brand-token,
      .brand-title,
      .brand-name,
      .brand-logo,
      .currency-symbol,
      .currency-code,
      .sku-code,
      .sku-badge,
      .size-badge,
      .gsm-badge,
      #ai-chat-widget,
      .ai-chat-root,
      .ai-chat-bubble,
      .ai-chat-input,
      textarea,
      input[type="text"],
      input[type="search"] {
        translate: no !important;
        -webkit-user-select: text;
      }
    `;
  }, []);

  // Helper to set or clear the Google Translate cookies
  const syncGoogleTranslateCookie = useCallback((code: string) => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    try {
      const hostname = window.location.hostname;
      const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
      const gCode = code === "zh" ? "zh-CN" : code;

      if (!code || code === "en") {
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${hostname};`;
        if (!isLocalhost) {
          document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${hostname};`;
        }
      } else {
        document.cookie = `googtrans=/en/${gCode}; path=/;`;
        document.cookie = `googtrans=/en/${gCode}; path=/; domain=${hostname};`;
        if (!isLocalhost) {
          document.cookie = `googtrans=/en/${gCode}; path=/; domain=.${hostname};`;
        }
      }

      const combo = document.querySelector(".goog-te-combo") as HTMLSelectElement;
      if (combo) {
        if (combo.value !== gCode) {
          combo.value = gCode;
          combo.dispatchEvent(new Event("change"));
        }
      }
    } catch (e) {
      console.warn("[LanguageProvider] Google Translate sync error:", e);
    }
  }, []);

  // Initialize Google Translate Element script and cleanup CSS once
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!document.getElementById("google_translate_element")) {
      const div = document.createElement("div");
      div.id = "google_translate_element";
      div.style.display = "none";
      div.style.position = "absolute";
      div.style.top = "-9999px";
      div.style.left = "-9999px";
      document.head.appendChild(div);
    }

    const styleId = "orizino-google-translate-cleanup";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.innerHTML = `
        /* Google Translate Top-Left Icon, Banner, Tooltips & Frame completely suppressed */
        .goog-te-banner-frame.skiptranslate,
        .goog-te-banner-frame,
        #goog-gt-tt,
        .goog-te-balloon-frame,
        .goog-tooltip,
        .goog-tooltip:hover,
        .VIpgJd-ZVi9od-ORHb-OEVmcd,
        .VIpgJd-ZVi9od-ORHb-OEVmcd-ti6hGc,
        .VIpgJd-ZVi9od-aZ2wEe-wOHMyf,
        .VIpgJd-ZVi9od-aZ2wEe-wOHMyf-ti6hGc,
        .VIpgJd-ZVi9od-xl07Ob-OEVmcd,
        .VIpgJd-ZVi9od-SmfZ-OEVmcd,
        .VIpgJd-ZVi9od-v9zn80,
        .VIpgJd-y61Fab-N0QZE3,
        .goog-logo-link,
        .goog-te-gadget,
        .goog-te-gadget-icon,
        .goog-te-spinner-pos,
        div[id^="goog-gt-"],
        div[class*="VIpgJd-"],
        iframe[id^=":"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
          width: 0 !important;
          height: 0 !important;
          position: absolute !important;
          top: -9999px !important;
          left: -9999px !important;
        }
        body {
          top: 0px !important;
          position: static !important;
        }
        .goog-text-highlight {
          background: transparent !important;
          background-color: transparent !important;
          box-shadow: none !important;
        }
        .skiptranslate > iframe {
          display: none !important;
        }
        #google_translate_element {
          display: none !important;
        }
      `;
      document.head.appendChild(style);
    }

    (window as any).googleTranslateElementInit = () => {
      try {
        if ((window as any).google?.translate?.TranslateElement) {
          new (window as any).google.translate.TranslateElement(
            {
              pageLanguage: "en",
              includedLanguages: ALL_LANGUAGES.map((l) => (l.code === "zh" ? "zh-CN" : l.code)).join(","),
              autoDisplay: false,
            },
            "google_translate_element"
          );
        }
      } catch (e) {
        console.warn("[LanguageProvider] Init TranslateElement failed:", e);
      }
    };

    const scriptId = "google-translate-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  const setLanguage = useCallback(
    (code: string) => {
      setLanguageState(code);
      localStorage.setItem("preferred_language", code);
      localStorage.setItem("orizino_user_lang_pref_set", "true");
      loadFontForLanguage(code);
      syncGoogleTranslateCookie(code);

      const combo = document.querySelector(".goog-te-combo") as HTMLSelectElement;
      if (combo) {
        combo.value = code === "zh" ? "zh-CN" : code;
        combo.dispatchEvent(new Event("change"));
      } else {
        setTimeout(() => {
          window.location.reload();
        }, 150);
      }

      if (user) {
        supabase
          .from("profiles")
          .select("preferences")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            const prefs = (data?.preferences as any) || {};
            supabase.from("profiles").update({ preferences: { ...prefs, language: code } }).eq("id", user.id);
          });
      }
    },
    [user, loadFontForLanguage, syncGoogleTranslateCookie]
  );

  // Country & Language Auto-Detection
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if user already explicitly saved a preference
    const savedPref = localStorage.getItem("preferred_language");
    const hasChosenPrompt = localStorage.getItem("orizino_user_lang_pref_set");

    if (savedPref) {
      setLanguageState(savedPref);
      loadFontForLanguage(savedPref);
      syncGoogleTranslateCookie(savedPref);
      return;
    }

    // Detection logic via browser locale & timezone
    const detectFromEnvironment = () => {
      const navLang = (navigator.language || (navigator as any).userLanguage || "en").toLowerCase();
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";

      let foundLang: LangDef | null = null;
      let countryLabel = "Your Region";

      // 1. Timezone & Region mappings
      if (/dhaka/i.test(timeZone) || navLang.startsWith("bn")) {
        foundLang = ALL_LANGUAGES.find((l) => l.code === "bn") || null;
        countryLabel = "Bangladesh";
      } else if (/tokyo/i.test(timeZone) || navLang.startsWith("ja")) {
        foundLang = ALL_LANGUAGES.find((l) => l.code === "ja") || null;
        countryLabel = "Japan";
      } else if (/seoul/i.test(timeZone) || navLang.startsWith("ko")) {
        foundLang = ALL_LANGUAGES.find((l) => l.code === "ko") || null;
        countryLabel = "South Korea";
      } else if (/shanghai|beijing|singapore/i.test(timeZone) || navLang.startsWith("zh")) {
        foundLang = ALL_LANGUAGES.find((l) => l.code === (navLang.includes("tw") || navLang.includes("hk") ? "zh-TW" : "zh")) || null;
        countryLabel = "Asia";
      } else if (/paris|brussels/i.test(timeZone) || navLang.startsWith("fr")) {
        foundLang = ALL_LANGUAGES.find((l) => l.code === "fr") || null;
        countryLabel = "France";
      } else if (/berlin|vienna|zurich/i.test(timeZone) || navLang.startsWith("de")) {
        foundLang = ALL_LANGUAGES.find((l) => l.code === "de") || null;
        countryLabel = "Germany";
      } else if (/madrid/i.test(timeZone) || navLang.startsWith("es")) {
        foundLang = ALL_LANGUAGES.find((l) => l.code === "es") || null;
        countryLabel = "Spain";
      } else if (/rome/i.test(timeZone) || navLang.startsWith("it")) {
        foundLang = ALL_LANGUAGES.find((l) => l.code === "it") || null;
        countryLabel = "Italy";
      } else if (/lisbon/i.test(timeZone) || navLang.startsWith("pt")) {
        foundLang = ALL_LANGUAGES.find((l) => l.code === "pt") || null;
        countryLabel = "Portugal";
      } else if (/moscow/i.test(timeZone) || navLang.startsWith("ru")) {
        foundLang = ALL_LANGUAGES.find((l) => l.code === "ru") || null;
        countryLabel = "Eastern Europe";
      } else if (/dubai|riyadh|cairo|kuwait|qatar/i.test(timeZone) || navLang.startsWith("ar")) {
        foundLang = ALL_LANGUAGES.find((l) => l.code === "ar") || null;
        countryLabel = "Middle East";
      } else if (/karachi/i.test(timeZone) || navLang.startsWith("ur")) {
        foundLang = ALL_LANGUAGES.find((l) => l.code === "ur") || null;
        countryLabel = "Pakistan";
      } else if (/kolkata/i.test(timeZone) || navLang.startsWith("hi")) {
        foundLang = ALL_LANGUAGES.find((l) => l.code === "hi") || null;
        countryLabel = "India";
      } else if (/bangkok/i.test(timeZone) || navLang.startsWith("th")) {
        foundLang = ALL_LANGUAGES.find((l) => l.code === "th") || null;
        countryLabel = "Thailand";
      } else if (/ho_chi_minh|saigon/i.test(timeZone) || navLang.startsWith("vi")) {
        foundLang = ALL_LANGUAGES.find((l) => l.code === "vi") || null;
        countryLabel = "Vietnam";
      } else if (/jakarta/i.test(timeZone) || navLang.startsWith("id")) {
        foundLang = ALL_LANGUAGES.find((l) => l.code === "id") || null;
        countryLabel = "Indonesia";
      } else if (/kuala_lumpur/i.test(timeZone) || navLang.startsWith("ms")) {
        foundLang = ALL_LANGUAGES.find((l) => l.code === "ms") || null;
        countryLabel = "Malaysia";
      } else if (/manila/i.test(timeZone) || navLang.startsWith("tl") || navLang.startsWith("fil")) {
        foundLang = ALL_LANGUAGES.find((l) => l.code === "tl") || null;
        countryLabel = "Philippines";
      } else if (/istanbul/i.test(timeZone) || navLang.startsWith("tr")) {
        foundLang = ALL_LANGUAGES.find((l) => l.code === "tr") || null;
        countryLabel = "Turkey";
      } else if (/amsterdam/i.test(timeZone) || navLang.startsWith("nl")) {
        foundLang = ALL_LANGUAGES.find((l) => l.code === "nl") || null;
        countryLabel = "Netherlands";
      } else if (/warsaw/i.test(timeZone) || navLang.startsWith("pl")) {
        foundLang = ALL_LANGUAGES.find((l) => l.code === "pl") || null;
        countryLabel = "Poland";
      } else if (/stockholm/i.test(timeZone) || navLang.startsWith("sv")) {
        foundLang = ALL_LANGUAGES.find((l) => l.code === "sv") || null;
        countryLabel = "Sweden";
      } else if (/athens/i.test(timeZone) || navLang.startsWith("el")) {
        foundLang = ALL_LANGUAGES.find((l) => l.code === "el") || null;
        countryLabel = "Greece";
      }

      // 2. Direct language prefix match fallback
      if (!foundLang) {
        const directCode = navLang.split("-")[0];
        foundLang = ALL_LANGUAGES.find((l) => l.code === directCode) || null;
      }

      if (foundLang && foundLang.code !== "en") {
        setDetectedCountry(countryLabel);
        setDetectedLang(foundLang);

        if (!hasChosenPrompt) {
          // Select detected language by default on first visit
          setLanguageState(foundLang.code);
          loadFontForLanguage(foundLang.code);
          syncGoogleTranslateCookie(foundLang.code);

          // Trigger the prompt inside the Dynamic Island via toast with actions
          const detectedTarget = foundLang;
          setTimeout(() => {
            toast({
              title: `Visiting from ${countryLabel}?`,
              description: `Browse in ${detectedTarget.nativeLabel} (${detectedTarget.label}) or English?`,
              type: "general",
              duration: 16000,
              actions: [
                {
                  label: `Browse in ${detectedTarget.nativeLabel}`,
                  primary: true,
                  onClick: () => {
                    setLanguage(detectedTarget.code);
                  },
                },
                {
                  label: "Stay in English",
                  onClick: () => {
                    setLanguage("en");
                  },
                },
              ],
            });
          }, 1200);
        }
      }
    };

    detectFromEnvironment();
  }, [loadFontForLanguage, syncGoogleTranslateCookie, setLanguage]);

  // Update dir, lang, and font on html element whenever language changes
  useEffect(() => {
    const langDef = ALL_LANGUAGES.find((l) => l.code === language);
    document.documentElement.dir = langDef?.dir || "ltr";
    document.documentElement.lang = language;
    loadFontForLanguage(language);
  }, [language, loadFontForLanguage]);

  const t = useCallback(
    (key: string): string => {
      if (language === "en") return EN_STRINGS[key] || key;
      return TRANSLATIONS[language]?.[key] || EN_STRINGS[key] || key;
    },
    [language]
  );

  const dir = ALL_LANGUAGES.find((l) => l.code === language)?.dir || "ltr";

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        dir,
        allLanguages: ALL_LANGUAGES,
        detectedCountry,
        detectedLang,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext;
// code:4ce0
