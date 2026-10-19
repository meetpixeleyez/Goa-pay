"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import PortalLayout from "@/components/layout/PortalLayout";
import {
  UserPlus,
  Users,
  Search,
  RefreshCw,
  Store,
  QrCode,
  UserCheck,
  Briefcase,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export default function UsersDirectoryPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (res.ok && data.users) {
        setUsers(data.users);
      }
    } catch (e) {
      console.error("Failed to load users:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.phone?.toLowerCase().includes(q) ||
          String(u.id).includes(q)
        );
      }
      return true;
    });
  }, [users, roleFilter, searchTerm]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return { label: "Super Admin", color: "bg-rose-50 text-rose-700 border-rose-200" };
      case "MERCHANT":
        return { label: "Merchant", color: "bg-blue-50 text-blue-700 border-blue-200" };
      case "QR_PROVIDER":
        return { label: "QR Provider", color: "bg-sky-50 text-sky-700 border-sky-200" };
      case "OPERATOR":
        return { label: "Operator", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      case "AGENT":
        return { label: "Agent", color: "bg-purple-50 text-purple-700 border-purple-200" };
      case "BROKER":
        return { label: "Broker", color: "bg-amber-50 text-amber-700 border-amber-200" };
      default:
        return { label: role, color: "bg-slate-50 text-slate-700 border-slate-200" };
    }
  };

  return (
    <PortalLayout
      portal="admin"
      title="User Directory"
      subtitle="View, search, and manage all provisioned accounts across all roles."
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="p-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg shadow-xs transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-primary" : ""}`} />
          </button>
          <Link
            href="/admin/users/create"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary-600 text-white rounded-lg text-xs font-bold shadow-xs transition"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ New User Create</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Filters Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, username, email..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-base-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {["ALL", "MERCHANT", "QR_PROVIDER", "OPERATOR", "AGENT", "BROKER", "ADMIN"].map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  roleFilter === r
                    ? "bg-primary text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {r === "ALL" ? "All Roles" : r.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Access</th>
                  <th className="py-3 px-4 text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                      <span>Loading user directory...</span>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No users found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const badge = getRoleBadge(u.role);
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-base-900">{u.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${badge.color}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {u.phone ? <div>📞 {u.phone}</div> : null}
                          {u.telegramId ? <div className="text-[11px] text-slate-500">✈️ {u.telegramId}</div> : null}
                          {!u.phone && !u.telegramId && <span className="text-slate-400 italic">None</span>}
                        </td>
                        <td className="py-3 px-4">
                          {u.status === "ACTIVE" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-semibold">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Inactive</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-[11px] font-medium ${u.portalAccess ? "text-slate-700" : "text-rose-600"}`}>
                            {u.portalAccess ? "Allowed" : "Blocked"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-500 font-mono text-[11px]">
                          {new Date(u.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
