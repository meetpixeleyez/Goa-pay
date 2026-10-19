import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../index";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MERCHANT" | "AGENT" | "QR_PROVIDER" | "BROKER" | "OPERATOR";
  phone?: string | null;
  telegramId?: string | null;
  status: string;
  portalAccess: boolean;
  transactionAllowed: boolean;
  balance?: number;
  exposure?: number;
  availableBalance?: number;
  walletBalance?: number;
  qrCodes?: any[];
  assignedQRCodes?: any[];
  qrProviderId?: string | null;
  qrProvider?: {
    id: string;
    name: string;
    email: string;
    status: string;
    transactionAllowed: boolean;
    balance: number;
    exposure: number;
    availableBalance: number;
  } | null;
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  initialized: boolean;
  error: string | null;
  lastFetched: number | null;
  availablePayoutCount: number;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  initialized: false,
  error: null,
  lastFetched: null,
  availablePayoutCount: 0,
};

// 1 minute in-memory cache TTL for auth session
const AUTH_CACHE_TTL_MS = 60 * 1000;

export const fetchCurrentUser = createAsyncThunk<
  UserProfile | null,
  { force?: boolean } | void,
  { state: RootState }
>(
  "auth/fetchCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { "Cache-Control": "no-cache" },
      });
      const data = await res.json();
      if (data.authenticated && data.user) {
        return data.user as UserProfile;
      }
      return null;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to load user session");
    }
  },
  {
    // Prevent duplicate in-flight requests and respect cache TTL unless force=true
    condition: (args, { getState }) => {
      const { auth } = getState();
      if (auth.loading) {
        return false; // Skip if already pending
      }
      const force = args && "force" in args ? Boolean(args.force) : false;
      if (force) {
        return true;
      }
      const now = Date.now();
      if (auth.initialized && auth.lastFetched && now - auth.lastFetched < AUTH_CACHE_TTL_MS) {
        return false; // Fresh cache: do not refetch
      }
      return true;
    },
  }
);

export const logoutUser = createAsyncThunk(
  "auth/logoutUser",
  async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      // Ignore logout errors
    }
    return null;
  }
);

export const fetchAvailablePayoutCount = createAsyncThunk<
  number,
  { portal: "qr-provider" | "operator" }
>(
  "auth/fetchAvailablePayoutCount",
  async ({ portal }) => {
    try {
      const endpoint = portal === "operator" ? "/api/operator/orders" : "/api/qr-provider/orders";
      const res = await fetch(endpoint);
      const data = await res.json();
      if (data.success && data.availablePayoutCount !== undefined) {
        return Number(data.availablePayoutCount);
      }
      return 0;
    } catch {
      return 0;
    }
  }
);

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<UserProfile | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      state.initialized = true;
      state.lastFetched = Date.now();
      state.loading = false;
      state.error = null;
    },
    clearUser: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.initialized = true;
      state.lastFetched = null;
      state.loading = false;
      state.error = null;
      state.availablePayoutCount = 0;
    },
    setAvailablePayoutCount: (state, action: PayloadAction<number>) => {
      state.availablePayoutCount = action.payload;
    },
    incrementAvailablePayoutCount: (state) => {
      state.availablePayoutCount += 1;
    },
    decrementAvailablePayoutCount: (state) => {
      state.availablePayoutCount = Math.max(0, state.availablePayoutCount - 1);
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchCurrentUser
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.initialized = true;
        state.user = action.payload;
        state.isAuthenticated = !!action.payload;
        state.lastFetched = Date.now();
        state.error = null;
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.loading = false;
        state.initialized = true;
        state.error = (action.payload as string) || action.error.message || "Failed to load session";
      })
      // logoutUser
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.initialized = true;
        state.lastFetched = null;
        state.loading = false;
        state.error = null;
        state.availablePayoutCount = 0;
      })
      // fetchAvailablePayoutCount
      .addCase(fetchAvailablePayoutCount.fulfilled, (state, action) => {
        state.availablePayoutCount = action.payload;
      });
  },
});

export const {
  setUser,
  clearUser,
  setAvailablePayoutCount,
  incrementAvailablePayoutCount,
  decrementAvailablePayoutCount,
} = authSlice.actions;

export default authSlice.reducer;
