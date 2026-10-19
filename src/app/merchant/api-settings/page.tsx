"use client";

import PortalLayout from "@/components/layout/PortalLayout";
import MerchantApiSettingsTab from "@/components/merchant/MerchantApiSettingsTab";
import { KeyRound } from "lucide-react";

export default function MerchantApiSettingsPage() {
  return (
    <PortalLayout
      portal="merchant"
      title="Developer API & Webhook Settings"
      subtitle="Manage your merchant API credentials, hosted checkout redirect URLs, and webhook callbacks."
    >
      <div className="max-w-6xl mx-auto py-2">
        <MerchantApiSettingsTab isAdminView={false} />
      </div>
    </PortalLayout>
  );
}
