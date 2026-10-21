"use client";

import Link from "next/link";
import PortalLayout from "@/components/layout/PortalLayout";
import { ArrowLeft, ShieldAlert, Users } from "lucide-react";

export default function AdminCreateOperatorNoticePage() {
  return (
    <PortalLayout
      portal="admin"
      title="Operator Provisioning Policy"
      subtitle="Operators are created exclusively by their parent QR Providers"
      actions={
        <Link
          href="/admin/operators"
          className="btn-back"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Operators Directory</span>
        </Link>
      }
    >
      <div className="max-w-xl mx-auto py-10">
        <div className="card-theme p-8 shadow-sm border border-slate-200 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <h3 className="font-bold text-lg text-slate-800">
            QR Provider Exclusive Creation Policy
          </h3>

          <p className="text-xs text-slate-600 leading-relaxed">
            Per system policy, <b>Operators can only be created by their parent QR Provider</b> via their dedicated portal (<span className="font-mono text-primary font-bold">/qr-provider/operators/create</span>).
          </p>

          <p className="text-xs text-slate-500">
            Super Admins oversee, monitor shift orders, supervise active QR codes, and audit transactions across all operators.
          </p>

          <div className="pt-4 flex justify-center space-x-3">
            <Link
              href="/admin/operators"
              className="btn-primary text-xs py-2 px-4 inline-flex items-center space-x-1.5 shadow"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Return to Operators Directory</span>
            </Link>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
