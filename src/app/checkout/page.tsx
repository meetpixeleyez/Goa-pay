"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchCurrentUser } from "@/store/slices/authSlice";

export default function InitiateCheckoutPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, initialized, loading: authLoading } = useAppSelector((state) => state.auth);
  const checkingAuth = !initialized && authLoading;

  useEffect(() => {
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  useEffect(() => {
    if (!initialized) return;

    if (!user) {
      router.replace("/login");
    } else if (user.role === "MERCHANT") {
      router.replace("/merchant/create-order");
    } else if (user.role === "ADMIN") {
      router.replace("/admin/orders");
    } else {
      router.replace("/login");
    }
  }, [user, initialized, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center px-4">
      {checkingAuth ? (
        <>
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm font-medium text-base-700">
            Verifying authentication status...
          </p>
        </>
      ) : (
        <div className="card-theme max-w-md w-full p-6 text-center space-y-3">
          <ShieldAlert className="w-10 h-10 text-sky-600 mx-auto" />
          <h2 className="text-base font-bold text-base-900">Authentication Required</h2>
          <p className="text-xs text-gray-600">
            Order creation requires an authenticated Merchant or Admin session. Please sign in to your portal.
          </p>
          <div className="pt-2">
            <Link href="/login" className="btn-primary py-2 px-5 text-xs font-bold inline-block">
              Go to Login
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
