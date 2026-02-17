"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useUserStore } from "@/store/userStore";

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { initAuth } = useUserStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return <>{children}</>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer>
        {children}
      </AuthInitializer>
    </QueryClientProvider>
  );
}
