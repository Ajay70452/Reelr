import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function handler(req: NextRequest) {
  const url = new URL(req.url);
  const path = url.pathname;
  const search = url.search;

  // Build the backend URL
  const backendUrl = `${BACKEND_URL}${path}${search}`;

  // Get the Supabase token from the custom header OR from Authorization
  let supabaseToken = req.headers.get("supabase-token");

  // Fallback: try to extract from Authorization header if it looks like a Supabase JWT (HS256)
  if (!supabaseToken) {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      // Check if it's a Supabase token (HS256) by looking at the header
      try {
        const headerPart = token.split(".")[0];
        const decoded = atob(headerPart.replace(/-/g, "+").replace(/_/g, "/"));
        if (decoded.includes('"HS256"')) {
          supabaseToken = token;
        }
        // If it's ES256 (Vercel's token), we skip it
      } catch {
        // Can't decode, skip
      }
    }
  }

  // Build headers for the backend
  const headers: Record<string, string> = {
    "Content-Type": req.headers.get("content-type") || "application/json",
  };

  if (supabaseToken) {
    headers["Authorization"] = `Bearer ${supabaseToken}`;
  }

  // Forward the request to the backend
  try {
    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
    };

    // Forward body for non-GET requests
    if (req.method !== "GET" && req.method !== "HEAD") {
      try {
        const body = await req.text();
        if (body) {
          fetchOptions.body = body;
        }
      } catch {
        // No body
      }
    }

    const response = await fetch(backendUrl, fetchOptions);
    const responseBody = await response.text();

    const res = new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
    });

    // Copy response headers
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "transfer-encoding" && key.toLowerCase() !== "connection") {
        res.headers.set(key, value);
      }
    });

    // Add diagnostic header so we can confirm this Route Handler is being used
    res.headers.set("x-proxy", "nextjs-route-handler");

    return res;
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { detail: `Backend unavailable: ${error}` },
      { status: 502, headers: { "x-proxy": "nextjs-route-handler-error" } }
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
