import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { getDashboardData } from "../../api/dashboard.js";
import { getApiErrorMessage } from "../../api/errors.js";

export const fetchDashboard = createAsyncThunk(
  "dashboard/fetchDashboard",
  async (role, { rejectWithValue }) => {
    try {
      return await getDashboardData(role);
    } catch (error) {
      return rejectWithValue(
        getApiErrorMessage(error, "Не удалось загрузить dashboard.")
      );
    }
  }
);

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState: {
    role: null,
    data: null,
    loading: false,
    error: null,
  },
  reducers: {
    resetDashboard(state) {
      state.role = null;
      state.data = null;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboard.pending, (state, action) => {
        state.role = action.meta.arg;
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload || action.error?.message || "Не удалось загрузить dashboard.";
      });
  },
});

export const { resetDashboard } = dashboardSlice.actions;
export default dashboardSlice.reducer;
