"use client";

// Re-export useAuth from shared AuthProvider context
// All components now share one single authentication state
export { useAuthContext as useAuth } from "@/providers/AuthProvider";
