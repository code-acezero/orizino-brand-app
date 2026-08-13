"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface LangDef {
  code: string;
  label: string;
  nativeLabel: string;
  dir: "ltr" | "rtl";
}

export const ALL_LANGUAGES: LangDef[] = [
  { code: "en", label: "English", nativeLabel: "English", dir: "ltr" },
  { code: "bn", label: "Bengali", nativeLabel: "বাংলা", dir: "ltr" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी", dir: "ltr" },
  { code: "ur", label: "Urdu", nativeLabel: "اردو", dir: "rtl" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", dir: "rtl" },
  { code: "ja", label: "Japanese", nativeLabel: "日本語", dir: "ltr" },
  { code: "zh", label: "Chinese", nativeLabel: "中文", dir: "ltr" },
  { code: "ko", label: "Korean", nativeLabel: "한국어", dir: "ltr" },
  { code: "es", label: "Spanish", nativeLabel: "Español", dir: "ltr" },
  { code: "fr", label: "French", nativeLabel: "Français", dir: "ltr" },
  { code: "de", label: "German", nativeLabel: "Deutsch", dir: "ltr" },
  { code: "pt", label: "Portuguese", nativeLabel: "Português", dir: "ltr" },
  { code: "ru", label: "Russian", nativeLabel: "Русский", dir: "ltr" },
  { code: "tr", label: "Turkish", nativeLabel: "Türkçe", dir: "ltr" },
  { code: "id", label: "Indonesian", nativeLabel: "Bahasa Indonesia", dir: "ltr" },
  { code: "th", label: "Thai", nativeLabel: "ไทย", dir: "ltr" },
  { code: "vi", label: "Vietnamese", nativeLabel: "Tiếng Việt", dir: "ltr" },
  { code: "ms", label: "Malay", nativeLabel: "Bahasa Melayu", dir: "ltr" },
  { code: "fa", label: "Persian", nativeLabel: "فارسی", dir: "rtl" },
  { code: "it", label: "Italian", nativeLabel: "Italiano", dir: "ltr" },
  { code: "nl", label: "Dutch", nativeLabel: "Nederlands", dir: "ltr" },
  { code: "pl", label: "Polish", nativeLabel: "Polski", dir: "ltr" },
  { code: "sv", label: "Swedish", nativeLabel: "Svenska", dir: "ltr" },
];

// Static English UI strings — translations loaded dynamically
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
  "checkout.giftWrap": "Gift Wrap",
  "checkout.deliveryOffer": "Delivery Offer",
  "checkout.tierDiscount": "Tier Discount",
  "checkout.points": "Points",
  "checkout.orderSummary": "Order Summary",
  "loyalty.redeemPoints": "Redeem Points",
  "loyalty.balance": "Balance",
  "loyalty.pointEquivalent": "1 point",
  "loyalty.redeemUpTo": "You can redeem up to",
  "loyalty.points": "points",
  "loyalty.noPoints": "0 points available",
  "loyalty.earnByOrdering": "Earn points by placing orders",
  "loyalty.max": "Max",
  "loyalty.clear": "Clear",
  "loyalty.saving": "Saving",
  "payment.provider": "Provider",
  "payment.label": "Label",
  "payment.accountNumber": "Account Number",
  "payment.savedAs": "Saved as",
  "payment.setDefault": "Set as default",
  "payment.invalidNumber": "Please enter a valid account number",
  "payment.numberDigitsOnly": "Account number must contain digits only",
  "payment.numberLength": "Account number length is invalid for this provider",
  "payment.labelRequired": "Label is required",
  "payment.noMethods": "No payment methods saved",
};

// Basic translation mappings for key languages
const TRANSLATIONS: Record<string, Record<string, string>> = {
  bn: {
    "nav.home": "হোম", "nav.shop": "শপ", "nav.cart": "কার্ট", "nav.wishlist": "ইচ্ছা তালিকা",
    "nav.orders": "অর্ডার", "nav.profile": "প্রোফাইল", "nav.settings": "সেটিংস",
    "nav.signIn": "সাইন ইন", "nav.signOut": "সাইন আউট", "nav.search": "পণ্য খুঁজুন...",
    "nav.categories": "ক্যাটাগরি", "nav.support": "সাপোর্ট",
    "common.save": "সংরক্ষণ", "common.cancel": "বাতিল", "common.delete": "মুছুন",
    "common.edit": "সম্পাদনা", "common.add": "যোগ করুন", "common.loading": "লোড হচ্ছে...",
    "common.addToCart": "কার্টে যোগ করুন", "common.buyNow": "এখনই কিনুন",
    "common.outOfStock": "স্টক নেই", "common.inStock": "স্টকে আছে",
    "common.noResults": "কোনো ফলাফল পাওয়া যায়নি", "common.viewAll": "সব দেখুন",
    "common.price": "মূল্য", "common.quantity": "পরিমাণ", "common.total": "মোট",
    "common.search": "খুঁজুন", "common.back": "পিছনে", "common.next": "পরবর্তী",
    "common.submit": "জমা দিন", "common.confirm": "নিশ্চিত", "common.close": "বন্ধ",
    "common.review": "রিভিউ", "common.reviews": "রিভিউসমূহ",
    "common.description": "বিবরণ", "common.specifications": "বিশদ বিবরণ",
    "settings.appearance": "থিম", "settings.notifications": "নোটিফিকেশন",
    "settings.security": "নিরাপত্তা", "settings.general": "সাধারণ",
    "settings.language": "ভাষা", "settings.currency": "মুদ্রা", "settings.darkMode": "ডার্ক মোড",
    "profile.personalInfo": "ব্যক্তিগত তথ্য", "profile.addresses": "ঠিকানা",
    "profile.payments": "পেমেন্ট", "profile.reviews": "রিভিউ",
    "profile.myOrders": "আমার অর্ডার", "profile.editProfile": "প্রোফাইল সম্পাদনা",
    "checkout.address": "শিপিং ঠিকানা", "checkout.payment": "পেমেন্ট পদ্ধতি",
    "checkout.review": "অর্ডার পর্যালোচনা", "checkout.placeOrder": "অর্ডার করুন",
    "checkout.subtotal": "সাবটোটাল", "checkout.shipping": "শিপিং",
    "checkout.discount": "ছাড়", "checkout.orderTotal": "মোট মূল্য",
    "cart.empty": "আপনার কার্ট খালি", "cart.continueShopping": "শপিং চালিয়ে যান",
    "cart.checkout": "চেকআউট",
    "wishlist.empty": "আপনার ইচ্ছা তালিকা খালি",
    "order.pending": "অপেক্ষমান", "order.processing": "প্রক্রিয়াকরণ",
    "order.shipped": "পাঠানো হয়েছে", "order.delivered": "বিতরণ হয়েছে",
    "order.cancelled": "বাতিল", "order.trackOrder": "অর্ডার ট্র্যাক করুন",
    "footer.subscribe": "সাবস্ক্রাইব", "footer.stayAhead": "এগিয়ে থাকুন",
    "footer.getLatest": "সর্বশেষ আপডেট পান",
    "home.featured": "বিশেষ পণ্য", "home.newArrivals": "নতুন পণ্য",
    "home.shopNow": "এখনই কিনুন", "home.trending": "ট্রেন্ডিং",
    "home.deals": "আজকের ডিল",
    "shop.filters": "ফিল্টার", "shop.sortBy": "সাজান",
    "shop.allCategories": "সব ক্যাটাগরি", "shop.noProducts": "কোনো পণ্য পাওয়া যায়নি",
    "product.addReview": "রিভিউ লিখুন", "product.relatedProducts": "আপনার পছন্দ হতে পারে",
    "support.aiAssistant": "এআই সাপোর্ট সহকারী", "support.typeQuestion": "আপনার প্রশ্ন লিখুন...",
    "orders.noOrders": "এখনো কোনো অর্ডার নেই", "orders.orderHistory": "অর্ডারের ইতিহাস",
    "profile.savedAddresses": "সংরক্ষিত ঠিকানা", "profile.accountSettings": "অ্যাকাউন্ট সেটিংস",
  },
  hi: {
    "nav.home": "होम", "nav.shop": "शॉप", "nav.cart": "कार्ट", "nav.wishlist": "इच्छा सूची",
    "nav.orders": "ऑर्डर", "nav.profile": "प्रोफ़ाइल", "nav.settings": "सेटिंग्स",
    "nav.signIn": "साइन इन", "nav.signOut": "साइन आउट", "nav.search": "उत्पाद खोजें...",
    "nav.categories": "श्रेणियाँ", "nav.support": "सहायता",
    "common.save": "सहेजें", "common.cancel": "रद्द करें", "common.delete": "हटाएं",
    "common.addToCart": "कार्ट में डालें", "common.buyNow": "अभी खरीदें",
    "common.outOfStock": "स्टॉक में नहीं", "common.inStock": "स्टॉक में है",
    "common.viewAll": "सभी देखें", "common.loading": "लोड हो रहा है...",
    "common.price": "कीमत", "common.total": "कुल",
    "settings.language": "भाषा", "settings.currency": "मुद्रा",
    "checkout.placeOrder": "ऑर्डर दें", "checkout.subtotal": "उपयोग",
    "cart.empty": "आपकी कार्ट खाली है", "cart.checkout": "चेकआउट",
    "order.pending": "लंबित", "order.delivered": "वितरित",
    "footer.subscribe": "सदस्यता लें",
  },
  ur: {
    "nav.home": "ہوم", "nav.shop": "شاپ", "nav.cart": "کارٹ", "nav.wishlist": "خواہش کی فہرست",
    "nav.orders": "آرڈرز", "nav.profile": "پروفائل", "nav.settings": "ترتیبات",
    "nav.signIn": "سائن ان", "nav.signOut": "سائن آؤٹ", "nav.search": "مصنوعات تلاش کریں...",
    "nav.categories": "زمرے", "nav.support": "مدد",
    "common.save": "محفوظ کریں", "common.cancel": "منسوخ", "common.delete": "حذف کریں",
    "common.addToCart": "کارٹ میں شامل کریں", "common.buyNow": "ابھی خریدیں",
    "common.viewAll": "سب دیکھیں", "common.loading": "...لوڈ ہو رہا ہے",
    "settings.language": "زبان", "settings.currency": "کرنسی",
    "checkout.placeOrder": "آرڈر دیں",
    "cart.empty": "آپ کی کارٹ خالی ہے",
    "footer.subscribe": "سبسکرائب",
  },
  ja: {
    "nav.home": "ホーム", "nav.shop": "ショップ", "nav.cart": "カート", "nav.wishlist": "ウィッシュリスト",
    "nav.orders": "注文", "nav.profile": "プロフィール", "nav.settings": "設定",
    "nav.signIn": "ログイン", "nav.signOut": "ログアウト", "nav.search": "商品を検索...",
    "nav.categories": "カテゴリ", "nav.support": "サポート",
    "common.save": "保存", "common.cancel": "キャンセル", "common.delete": "削除",
    "common.addToCart": "カートに追加", "common.buyNow": "今すぐ購入",
    "common.outOfStock": "在庫切れ", "common.inStock": "在庫あり",
    "common.viewAll": "すべて見る", "common.loading": "読み込み中...",
    "common.price": "価格", "common.total": "合計",
    "common.description": "説明", "common.reviews": "レビュー",
    "settings.language": "言語", "settings.currency": "通貨",
    "checkout.placeOrder": "注文する", "checkout.subtotal": "小計",
    "cart.empty": "カートは空です", "cart.checkout": "チェックアウト",
    "order.pending": "保留中", "order.delivered": "配達済み",
    "footer.subscribe": "登録",
  },
  zh: {
    "nav.home": "首页", "nav.shop": "商店", "nav.cart": "购物车", "nav.wishlist": "愿望清单",
    "nav.orders": "订单", "nav.profile": "个人资料", "nav.settings": "设置",
    "nav.signIn": "登录", "nav.signOut": "退出", "nav.search": "搜索商品...",
    "nav.categories": "分类", "nav.support": "客服",
    "common.save": "保存", "common.cancel": "取消", "common.delete": "删除",
    "common.addToCart": "加入购物车", "common.buyNow": "立即购买",
    "common.outOfStock": "缺货", "common.inStock": "有货",
    "common.viewAll": "查看全部", "common.loading": "加载中...",
    "common.price": "价格", "common.total": "总计",
    "common.description": "描述", "common.reviews": "评价",
    "settings.language": "语言", "settings.currency": "货币",
    "checkout.placeOrder": "下单", "checkout.subtotal": "小计",
    "cart.empty": "购物车为空", "cart.checkout": "结算",
    "order.pending": "待处理", "order.delivered": "已送达",
    "footer.subscribe": "订阅",
  },
  ko: {
    "nav.home": "홈", "nav.shop": "쇼핑", "nav.cart": "장바구니", "nav.wishlist": "위시리스트",
    "nav.orders": "주문", "nav.profile": "프로필", "nav.settings": "설정",
    "nav.signIn": "로그인", "nav.signOut": "로그아웃", "nav.search": "상품 검색...",
    "nav.categories": "카테고리", "nav.support": "고객센터",
    "common.save": "저장", "common.cancel": "취소", "common.delete": "삭제",
    "common.addToCart": "장바구니에 담기", "common.buyNow": "바로 구매",
    "common.outOfStock": "품절", "common.inStock": "재고 있음",
    "common.viewAll": "모두 보기", "common.loading": "로딩 중...",
    "settings.language": "언어", "settings.currency": "통화",
    "checkout.placeOrder": "주문하기",
    "cart.empty": "장바구니가 비어 있습니다",
    "footer.subscribe": "구독",
  },
  ar: {
    "nav.home": "الرئيسية", "nav.shop": "المتجر", "nav.cart": "السلة", "nav.wishlist": "المفضلة",
    "nav.orders": "الطلبات", "nav.profile": "الملف الشخصي", "nav.settings": "الإعدادات",
    "nav.signIn": "تسجيل الدخول", "nav.signOut": "تسجيل الخروج", "nav.search": "ابحث عن منتجات...",
    "nav.categories": "الأقسام", "nav.support": "الدعم",
    "common.save": "حفظ", "common.cancel": "إلغاء", "common.delete": "حذف",
    "common.addToCart": "أضف إلى السلة", "common.buyNow": "اشتر الآن",
    "common.outOfStock": "غير متوفر", "common.inStock": "متوفر",
    "common.viewAll": "عرض الكل", "common.loading": "...جاري التحميل",
    "settings.language": "اللغة", "settings.currency": "العملة",
    "checkout.placeOrder": "تقديم الطلب",
    "cart.empty": "سلة التسوق فارغة",
    "footer.subscribe": "اشترك",
  },
  es: {
    "nav.home": "Inicio", "nav.shop": "Tienda", "nav.cart": "Carrito", "nav.wishlist": "Favoritos",
    "nav.orders": "Pedidos", "nav.profile": "Perfil", "nav.settings": "Ajustes",
    "nav.signIn": "Iniciar sesión", "nav.signOut": "Cerrar sesión", "nav.search": "Buscar productos...",
    "common.save": "Guardar", "common.cancel": "Cancelar", "common.addToCart": "Añadir al carrito",
    "common.buyNow": "Comprar ahora", "common.viewAll": "Ver todo",
    "settings.language": "Idioma", "settings.currency": "Moneda",
    "checkout.placeOrder": "Realizar pedido",
    "cart.empty": "Tu carrito está vacío",
  },
  fr: {
    "nav.home": "Accueil", "nav.shop": "Boutique", "nav.cart": "Panier", "nav.wishlist": "Favoris",
    "nav.orders": "Commandes", "nav.profile": "Profil", "nav.settings": "Paramètres",
    "nav.signIn": "Connexion", "nav.signOut": "Déconnexion", "nav.search": "Rechercher...",
    "common.save": "Enregistrer", "common.cancel": "Annuler", "common.addToCart": "Ajouter au panier",
    "common.buyNow": "Acheter maintenant", "common.viewAll": "Voir tout",
    "settings.language": "Langue", "settings.currency": "Devise",
    "checkout.placeOrder": "Passer la commande",
    "cart.empty": "Votre panier est vide",
  },
  de: {
    "nav.home": "Startseite", "nav.shop": "Shop", "nav.cart": "Warenkorb", "nav.wishlist": "Wunschliste",
    "nav.orders": "Bestellungen", "nav.profile": "Profil", "nav.settings": "Einstellungen",
    "nav.signIn": "Anmelden", "nav.signOut": "Abmelden", "nav.search": "Produkte suchen...",
    "common.save": "Speichern", "common.cancel": "Abbrechen", "common.addToCart": "In den Warenkorb",
    "settings.language": "Sprache", "settings.currency": "Währung",
    "checkout.placeOrder": "Bestellung aufgeben",
  },
  pt: {
    "nav.home": "Início", "nav.shop": "Loja", "nav.cart": "Carrinho", "nav.wishlist": "Favoritos",
    "nav.signIn": "Entrar", "nav.signOut": "Sair", "nav.search": "Buscar produtos...",
    "common.save": "Salvar", "common.cancel": "Cancelar", "common.addToCart": "Adicionar ao carrinho",
    "settings.language": "Idioma", "checkout.placeOrder": "Fazer pedido",
  },
  ru: {
    "nav.home": "Главная", "nav.shop": "Магазин", "nav.cart": "Корзина", "nav.wishlist": "Избранное",
    "nav.orders": "Заказы", "nav.signIn": "Войти", "nav.signOut": "Выйти",
    "common.save": "Сохранить", "common.cancel": "Отмена", "common.addToCart": "В корзину",
    "settings.language": "Язык", "checkout.placeOrder": "Оформить заказ",
  },
  tr: {
    "nav.home": "Anasayfa", "nav.shop": "Mağaza", "nav.cart": "Sepet", "nav.wishlist": "İstek Listesi",
    "nav.signIn": "Giriş Yap", "nav.signOut": "Çıkış Yap", "nav.search": "Ürün ara...",
    "common.save": "Kaydet", "common.cancel": "İptal", "common.addToCart": "Sepete Ekle",
    "settings.language": "Dil", "checkout.placeOrder": "Sipariş Ver",
  },
  fa: {
    "nav.home": "خانه", "nav.shop": "فروشگاه", "nav.cart": "سبد خرید", "nav.wishlist": "لیست علاقه‌مندی‌ها",
    "nav.signIn": "ورود", "nav.signOut": "خروج", "nav.search": "جستجوی محصولات...",
    "common.save": "ذخیره", "common.cancel": "لغو", "common.addToCart": "افزودن به سبد",
    "settings.language": "زبان", "checkout.placeOrder": "ثبت سفارش",
  },
  it: {
    "nav.home": "Home", "nav.shop": "Negozio", "nav.cart": "Carrello", "nav.wishlist": "Preferiti",
    "nav.signIn": "Accedi", "nav.signOut": "Esci", "common.addToCart": "Aggiungi al carrello",
    "settings.language": "Lingua", "checkout.placeOrder": "Effettua ordine",
  },
  th: {
    "nav.home": "หน้าแรก", "nav.shop": "ร้านค้า", "nav.cart": "ตะกร้า", "nav.wishlist": "รายการโปรด",
    "nav.signIn": "เข้าสู่ระบบ", "nav.signOut": "ออกจากระบบ", "nav.search": "ค้นหาสินค้า...",
    "common.save": "บันทึก", "common.cancel": "ยกเลิก", "common.addToCart": "เพิ่มลงตะกร้า",
    "settings.language": "ภาษา", "checkout.placeOrder": "สั่งซื้อ",
  },
  vi: {
    "nav.home": "Trang chủ", "nav.shop": "Cửa hàng", "nav.cart": "Giỏ hàng", "nav.wishlist": "Yêu thích",
    "nav.signIn": "Đăng nhập", "nav.signOut": "Đăng xuất", "nav.search": "Tìm sản phẩm...",
    "common.save": "Lưu", "common.cancel": "Hủy", "common.addToCart": "Thêm vào giỏ",
    "settings.language": "Ngôn ngữ", "checkout.placeOrder": "Đặt hàng",
  },
  id: {
    "nav.home": "Beranda", "nav.shop": "Toko", "nav.cart": "Keranjang", "nav.wishlist": "Daftar Keinginan",
    "nav.signIn": "Masuk", "nav.signOut": "Keluar", "nav.search": "Cari produk...",
    "common.save": "Simpan", "common.cancel": "Batal", "common.addToCart": "Tambah ke Keranjang",
    "settings.language": "Bahasa", "checkout.placeOrder": "Pesan Sekarang",
  },
  ms: {
    "nav.home": "Laman Utama", "nav.shop": "Kedai", "nav.cart": "Troli",
    "nav.signIn": "Log Masuk", "nav.signOut": "Log Keluar",
    "common.save": "Simpan", "common.addToCart": "Tambah ke Troli",
    "settings.language": "Bahasa", "checkout.placeOrder": "Buat Pesanan",
  },
};

interface LanguageContextType {
  language: string;
  setLanguage: (code: string) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
  allLanguages: LangDef[];
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key) => key,
  dir: "ltr",
  allLanguages: ALL_LANGUAGES,
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState("en");
  const { user } = useAuth();

  // Load from preferences
  useEffect(() => {
    const saved = localStorage.getItem("preferred_language");
    if (saved) {
      setLanguageState(saved);
      return;
    }
    if (!user) return;
    supabase.from("profiles").select("preferences").eq("id", user.id).single().then(({ data }) => {
      const lang = (data?.preferences as any)?.language;
      if (lang) setLanguageState(lang);
    });
  }, [user]);

  // Update dir on html element
  useEffect(() => {
    const langDef = ALL_LANGUAGES.find((l) => l.code === language);
    document.documentElement.dir = langDef?.dir || "ltr";
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((code: string) => {
    setLanguageState(code);
    localStorage.setItem("preferred_language", code);
    if (user) {
      supabase.from("profiles").select("preferences").eq("id", user.id).single().then(({ data }) => {
        const prefs = (data?.preferences as any) || {};
        supabase.from("profiles").update({ preferences: { ...prefs, language: code } }).eq("id", user.id);
      });
    }
  }, [user]);

  const t = useCallback((key: string): string => {
    if (language === "en") return EN_STRINGS[key] || key;
    return TRANSLATIONS[language]?.[key] || EN_STRINGS[key] || key;
  }, [language]);

  const dir = ALL_LANGUAGES.find((l) => l.code === language)?.dir || "ltr";

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir, allLanguages: ALL_LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext;
