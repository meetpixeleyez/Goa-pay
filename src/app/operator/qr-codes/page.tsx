"use client";

import { useEffect, useState } from "react";
import PortalLayout from "@/components/layout/PortalLayout";
import {
  QrCode,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Building,
  User,
  ShoppingBag,
  AlertCircle,
  X,
  ZoomIn,
} from "lucide-react";

import { apiClient } from "@/lib/api/client";

export default function OperatorQRCodesPage() {
  const [qrCodes, setQrCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const fetchQRCodes = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await apiClient.get<{ success: boolean; qrCodes: any[] }>("/api/operator/qr-codes");
      if (data.success) {
        setQrCodes(data.qrCodes || []);
      }
    } catch (e: any) {
      setError("Failed to load assigned collection QR codes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQRCodes();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <PortalLayout
      portal="operator"
      title="My Assigned QR Codes"
      subtitle="Collection UPI QR codes assigned to your shift. Orders sent to these QR codes route to your queue."
      actions={
        <button
          onClick={fetchQRCodes}
          className="p-2 bg-white border border-base-200 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center space-x-1 text-xs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      }
    >
      <div className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError("")} className="text-red-700 hover:text-red-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Info Banner */}
        <div className="card-theme p-4 border-l-4 border-l-primary flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center text-[#0c4a6e]">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-base-900">
                {qrCodes.length} Collection QR Code{qrCodes.length === 1 ? "" : "s"} Assigned
              </h3>
              <p className="text-[11px] text-base-700">
                Your manager (QR Provider) assigns and maintains these collection accounts for you.
              </p>
            </div>
          </div>
        </div>

        {/* QR Codes Grid */}
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center card-theme">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
            <span>Loading assigned QR codes...</span>
          </div>
        ) : qrCodes.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-2 card-theme">
            <QrCode className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="font-bold text-sm text-gray-800">No QR Codes Assigned Yet</p>
            <p>
              Your QR Provider manager has not assigned any collection QR codes to your account yet. Contact them to allocate QR codes to your shift.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {qrCodes.map((qr) => {
              const isActive = qr.isActive && qr.status === "ACTIVE";

              return (
                <div
                  key={qr.id}
                  className="card-theme p-4 flex flex-col justify-between space-y-4 hover:shadow-md transition"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-base-200">
                      <div>
                        <span className="font-bold text-sm text-base-900 block">{qr.name || "UPI QR"}</span>
                        <span className="text-[10px] text-slate-500">
                          Owner: {qr.provider?.name || "QR Provider"}
                        </span>
                      </div>
                      <span
                        className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                          isActive
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                            : "bg-red-50 text-red-800 border-red-300"
                        }`}
                      >
                        {isActive ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-600" />
                        )}
                        <span>{isActive ? "ACTIVE" : "PAUSED"}</span>
                      </span>
                    </div>

                    {/* QR Code Image Preview */}
                    <div
                      onClick={() => setLightboxImage(qr.imageUrl)}
                      className="p-3 bg-white border border-base-200 rounded-xl flex items-center justify-center relative group cursor-pointer shadow-inner"
                    >
                      <img
                        src={qr.imageUrl}
                        alt="UPI QR Code"
                        className="w-40 h-40 object-contain rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition rounded-xl text-white text-xs font-bold space-x-1">
                        <ZoomIn className="w-4 h-4" />
                        <span>Enlarge QR</span>
                      </div>
                    </div>

                    {/* QR Details */}
                    <div className="space-y-2 text-xs">
                      {/* UPI ID */}
                      <div className="p-2.5 bg-white border border-base-200 rounded-lg">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                          UPI ID / VPA
                        </span>
                        <div className="flex items-center justify-between mt-0.5 gap-2">
                          <code className="font-mono font-bold text-base-900 text-xs truncate">
                            {qr.upiId}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopy(qr.upiId, qr.id)}
                            className="text-gray-400 hover:text-gray-700 p-1 hover:bg-gray-100 rounded"
                            title="Copy UPI ID"
                          >
                            {copiedId === qr.id ? (
                              <Check className="w-3.5 h-3.5 text-green-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Bank & Account Info */}
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2 bg-white/70 border border-base-200/70 rounded-lg">
                          <span className="text-[10px] text-gray-400 block font-medium">Account Name</span>
                          <span className="font-bold text-gray-800 truncate block">
                            {qr.accountHolderName || "—"}
                          </span>
                        </div>
                        <div className="p-2 bg-white/70 border border-base-200/70 rounded-lg">
                          <span className="text-[10px] text-gray-400 block font-medium">Bank</span>
                          <span className="font-bold text-gray-800 truncate block">
                            {qr.bankName || "—"}
                          </span>
                        </div>
                      </div>

                      {/* Order Count Handled */}
                      <div className="p-2 bg-white/70 border border-base-200/70 rounded-lg flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Orders Routed to this QR:</span>
                        <span className="font-extrabold text-base-900">
                          {qr._count?.orders || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* LIGHTBOX MODAL */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-sm max-h-[90vh] bg-white p-4 rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 p-1"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={lightboxImage}
              alt="UPI QR Code"
              className="w-72 h-72 object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
