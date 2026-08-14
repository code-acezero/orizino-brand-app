"use client";
import React from "react";
import { useLocation } from "@/lib/router-compat";
import AdminRoute from "@/components/AdminRoute";
import MasterPanelLayout from "@/components/admin/MasterPanelLayout";

// Import pages
import AdminLanding from "@/_pages/admin/AdminLanding";
import AdminMasterControl from "@/_pages/admin/AdminMasterControl";
import AdminProfile from "@/_pages/admin/AdminProfile";

// Dashboards
import SalesDashboard from "@/_pages/admin/dashboards/SalesDashboard";
import SeoAdsDashboard from "@/_pages/admin/dashboards/SeoAdsDashboard";
import EmailDashboard from "@/_pages/admin/dashboards/EmailDashboard";
import AffiliateDashboard from "@/_pages/admin/dashboards/AffiliateDashboard";
import BrandDashboard from "@/_pages/admin/dashboards/BrandDashboard";
import SystemDashboard from "@/_pages/admin/dashboards/SystemDashboard";
import SettingsAiDashboard from "@/_pages/admin/dashboards/SettingsAiDashboard";
import TeamDashboard from "@/_pages/admin/dashboards/TeamDashboard";

// Sales pages
import AdminProductsManagement from "@/_pages/admin/AdminProductsManagement";
import AdminProductsHub from "@/_pages/admin/AdminProductsHub";
import AdminProducts from "@/_pages/admin/AdminProducts";
import AdminCategories from "@/_pages/admin/AdminCategories";
import AdminOfflineOrders from "@/_pages/admin/AdminOfflineOrders";
import AdminInvoiceStickers from "@/_pages/admin/AdminInvoiceStickers";
import AdminCoupons from "@/_pages/admin/AdminCoupons";
import AdminReviews from "@/_pages/admin/AdminReviews";
import AdminRequests from "@/_pages/admin/AdminRequests";
import AdminUserPromos from "@/_pages/admin/AdminUserPromos";
import AdminDeliveryOffers from "@/_pages/admin/AdminDeliveryOffers";
import AdminShowcase from "@/_pages/admin/AdminShowcase";
import AdminCustomersHub from "@/_pages/admin/AdminCustomersHub";
import AdminCustomers from "@/_pages/admin/AdminCustomers";
import AdminSupport from "@/_pages/admin/AdminSupport";
import AdminCustomerAnalytics from "@/_pages/admin/AdminCustomerAnalytics";
import AdminLiveActivity from "@/_pages/admin/AdminLiveActivity";
import AdminPaymentsCouriers from "@/_pages/admin/AdminPaymentsCouriers";
import AdminPaymentGateways from "@/_pages/admin/AdminPaymentGateways";
import AdminOrders from "@/_pages/admin/AdminOrders";
import AdminReturns from "@/_pages/admin/AdminReturns";
import AdminShipping from "@/_pages/admin/AdminShipping";
import AdminCouriers from "@/_pages/admin/AdminCouriers";
import AdminCourierManagement from "@/_pages/admin/AdminCourierManagement";

// Marketing & Email pages
import AdminSeo from "@/_pages/admin/AdminSeo";
import AdminTracking from "@/_pages/admin/AdminTracking";
import AdminAnnouncements from "@/_pages/admin/AdminAnnouncements";
import AdminEmailProvider from "@/_pages/admin/AdminEmailProvider";
import AdminEmailSubscribers from "@/_pages/admin/AdminEmailSubscribers";
import AdminEmailCampaigns from "@/_pages/admin/AdminEmailCampaigns";
import AdminEmailTemplates from "@/_pages/admin/AdminEmailTemplates";
import AdminEmailAutomations from "@/_pages/admin/AdminEmailAutomations";
import AffiliateHub from "@/_pages/admin/AffiliateHub";

// Brand pages
import AdminBranding from "@/_pages/admin/AdminBranding";
import AdminAppearance from "@/_pages/admin/AdminAppearance";
import AdminBanners from "@/_pages/admin/AdminBanners";
import AdminFooter from "@/_pages/admin/AdminFooter";
import AdminMobileUI from "@/_pages/admin/AdminMobileUI";
import AdminCompanyLanding from "@/_pages/admin/AdminCompanyLanding";
import AdminBrandHomeNews from "@/_pages/admin/AdminBrandHomeNews";
import AdminBrandHomeDocs from "@/_pages/admin/AdminBrandHomeDocs";
import AdminBrandHomeTrack from "@/_pages/admin/AdminBrandHomeTrack";
import AdminBrandHomeScanner from "@/_pages/admin/AdminBrandHomeScanner";
import AdminHome from "@/_pages/admin/AdminHome";
import AdminCmsPages from "@/_pages/admin/AdminCmsPages";

// System & Settings pages
import AdminDbHealth from "@/_pages/admin/AdminDbHealth";
import AdminDebug from "@/_pages/admin/AdminDebug";
import AdminSettings from "@/_pages/admin/AdminSettings";
import AdminAISettings from "@/_pages/admin/AdminAISettings";
import AdminRecommendations from "@/_pages/admin/AdminRecommendations";
import AdminCallSettings from "@/_pages/admin/AdminCallSettings";
import AdminTelegram from "@/_pages/admin/AdminTelegram";
import AdminRedirects from "@/_pages/admin/AdminRedirects";

// Team pages
import AdminTeams from "@/_pages/admin/AdminTeams";
import AdminMyTeam from "@/_pages/admin/AdminMyTeam";
import AdminEmployees from "@/_pages/admin/AdminEmployees";
import AdminAuditLog from "@/_pages/admin/AdminAuditLog";

// Auth pages
import AdminAuthPage from "@/_pages/AdminAuthPage";
import ResetPasswordPage from "@/_pages/ResetPasswordPage";

const ROUTE_COMPONENTS: Record<string, React.ComponentType<any>> = {
  "/": AdminLanding,
  "/master": AdminMasterControl,
  "/master-control": AdminMasterControl,
  "/master/profile": AdminProfile,

  // Sales
  "/sales": SalesDashboard,
  "/sales/products-management": AdminProductsManagement,
  "/sales/products-hub": AdminProductsHub,
  "/sales/products": AdminProducts,
  "/sales/categories": AdminCategories,
  "/sales/offline-orders": AdminOfflineOrders,
  "/sales/invoice-stickers": AdminInvoiceStickers,
  "/sales/coupons": AdminCoupons,
  "/sales/reviews": AdminReviews,
  "/sales/requests": AdminRequests,
  "/sales/user-promos": AdminUserPromos,
  "/sales/delivery-offers": AdminDeliveryOffers,
  "/sales/showcase": AdminShowcase,
  "/sales/customers-hub": AdminCustomersHub,
  "/sales/customers": AdminCustomers,
  "/sales/support": AdminSupport,
  "/sales/customer-analytics": AdminCustomerAnalytics,
  "/sales/live-activity": AdminLiveActivity,
  "/sales/payments-couriers": AdminPaymentsCouriers,
  "/sales/payment-gateways": AdminPaymentGateways,
  "/sales/orders": AdminOrders,
  "/sales/returns": AdminReturns,
  "/sales/shipping": AdminShipping,
  "/sales/couriers": AdminCouriers,
  "/sales/courier-management": AdminCourierManagement,

  // Marketing & Email
  "/marketing": SeoAdsDashboard,
  "/marketing/seo": AdminSeo,
  "/marketing/tracking": AdminTracking,
  "/marketing/announcements": AdminAnnouncements,
  "/email": EmailDashboard,
  "/email/provider": AdminEmailProvider,
  "/email/subscribers": AdminEmailSubscribers,
  "/email/campaigns": AdminEmailCampaigns,
  "/email/templates": AdminEmailTemplates,
  "/email/automations": AdminEmailAutomations,
  "/affiliate": AffiliateDashboard,
  "/affiliate/overview": AffiliateHub,

  // Brand
  "/brand": BrandDashboard,
  "/brand/branding": AdminBranding,
  "/brand/appearance": AdminAppearance,
  "/brand/banners": AdminBanners,
  "/brand/footer": AdminFooter,
  "/brand/mobile-ui": AdminMobileUI,
  "/brand/landing": AdminCompanyLanding,
  "/brand/news": AdminBrandHomeNews,
  "/brand/docs": AdminBrandHomeDocs,
  "/brand/track": AdminBrandHomeTrack,
  "/brand/scanner": AdminBrandHomeScanner,
  "/brand/scanner-info": AdminBrandHomeScanner,
  "/brand/home": AdminHome,
  "/brand/showcase": AdminShowcase,
  "/brand/cms-pages": AdminCmsPages,

  // System & Settings
  "/system": SystemDashboard,
  "/system/db-health": AdminDbHealth,
  "/system/debug": AdminDebug,
  "/settings-ai": SettingsAiDashboard,
  "/settings-ai/brand": BrandDashboard,
  "/settings-ai/branding": AdminBranding,
  "/settings-ai/appearance": AdminAppearance,
  "/settings-ai/general": AdminSettings,
  "/settings-ai/ai-settings": AdminAISettings,
  "/settings-ai/recommendations": AdminRecommendations,
  "/settings-ai/call-settings": AdminCallSettings,
  "/settings-ai/telegram": AdminTelegram,
  "/settings-ai/redirects": AdminRedirects,

  // Team
  "/team": TeamDashboard,
  "/team/teams": AdminTeams,
  "/team/my-team": AdminMyTeam,
  "/team/employees": AdminEmployees,
  "/team/audit-log": AdminAuditLog,
  "/team/access": AdminEmployees,
};

export default function MasterPanelShell({ children }: { children?: React.ReactNode }) {
  const location = useLocation();
  const path = location.pathname.replace(/\/$/, "") || "/";

  if (path === "/auth") {
    return <AdminAuthPage />;
  }

  if (path === "/reset-password" || path === "/auth/reset-password") {
    return <ResetPasswordPage />;
  }

  const PageComponent = ROUTE_COMPONENTS[path] || AdminLanding;

  return (
    <React.Suspense fallback={null}>
      <AdminRoute>
        <MasterPanelLayout>
          <React.Suspense fallback={null}>
            {children ?? <PageComponent />}
          </React.Suspense>
        </MasterPanelLayout>
      </AdminRoute>
    </React.Suspense>
  );
}
