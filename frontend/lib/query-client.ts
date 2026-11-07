import { QueryClient } from "@tanstack/react-query";
import axios from "axios";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (!axios.isAxiosError(error)) return false;
        const status = error.response?.status;
        return failureCount < 2 && (!status || status >= 500);
      },
    },
  },
});
