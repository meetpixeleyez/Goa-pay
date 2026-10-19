import { useState, useEffect, useCallback } from "react";
import { qrProvidersApi } from "@/lib/api/qr-providers.api";
import { QRCodeItem, CreateQRCodeInput, UpdateQRCodeInput } from "@/types/qr-provider";

export function useQRCodes(providerId?: string) {
  const [qrCodes, setQrCodes] = useState<QRCodeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQRCodes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await qrProvidersApi.getQRCodes({ providerId });
      setQrCodes(res.qrCodes || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch QR codes");
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => {
    fetchQRCodes();
  }, [fetchQRCodes]);

  const toggleStatus = useCallback(async (id: string) => {
    try {
      const res = await qrProvidersApi.toggleQRCode(id);
      setQrCodes((prev) =>
        prev.map((qr) => (qr.id === id ? { ...qr, isActive: res.qrCode.isActive, status: res.qrCode.status } : qr))
      );
      return res.qrCode;
    } catch (err: any) {
      throw new Error(err.message || "Failed to toggle status");
    }
  }, []);

  const createQRCode = useCallback(
    async (input: CreateQRCodeInput) => {
      const res = await qrProvidersApi.createQRCode({
        ...input,
        providerId: providerId || input.providerId,
      });
      await fetchQRCodes();
      return res.qrCode;
    },
    [fetchQRCodes, providerId]
  );

  const updateQRCode = useCallback(
    async (id: string, input: UpdateQRCodeInput) => {
      const res = await qrProvidersApi.updateQRCode(id, input);
      await fetchQRCodes();
      return res.qrCode;
    },
    [fetchQRCodes]
  );

  const deleteQRCode = useCallback(
    async (id: string) => {
      await qrProvidersApi.deleteQRCode(id);
      setQrCodes((prev) => prev.filter((qr) => qr.id !== id));
    },
    []
  );

  return {
    qrCodes,
    loading,
    error,
    refetch: fetchQRCodes,
    toggleStatus,
    createQRCode,
    updateQRCode,
    deleteQRCode,
  };
}
