import { toast } from "sonner";

/**
 * Universal JSON API Client
 * 
 * Logic:
 * 1. Handles GET, POST, PATCH, PUT, DELETE.
 * 2. If response is !ok and method is NOT 'GET', triggers a global red toast.
 * 3. Standardizes error messages based on status codes.
 * 4. Returns parsed JSON on success.
 */

interface ApiClientOptions extends RequestInit {
  showToast?: boolean; // Manual override if needed
}

export async function apiClient<T = any>(
  url: string,
  options: ApiClientOptions = {}
): Promise<T> {
  const method = options.method?.toUpperCase() || "GET";

  try {
    const res = await fetch(url, options);

    if (!res.ok) {
      let message = "Operation failed";
      const status = res.status;

      // Extract custom error message from API if possible
      try {
        const errorData = await res.json();
        message = errorData.error || message;
      } catch {
        // Fallback for non-JSON or missing error key
        if (status === 403) message = "Forbidden";
        else if (status === 405) message = "Method Not Allowed";
        else if (status >= 500) message = "Internal Server Error";
      }

      // 🛡️ Global Security Protocol: Auto-toast on non-GET errors
      if (method !== "GET" && options.showToast !== false) {
        toast.error(message, {
          className: "font-normal text-[13px] tracking-tight", // Simple, human readable, not bold
          duration: 5000,
          closeButton: true,
        });
      }

      throw new Error(message);
    }

    // Success path
    try {
      return await res.json() as T;
    } catch {
      return {} as T;
    }
  } catch (error: any) {
    // Re-throw so component can handle local state (e.g. stopping loaders)
    throw error;
  }
}
