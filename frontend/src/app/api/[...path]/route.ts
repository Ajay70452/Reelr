import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function handler(req: NextRequest) {
  // Extract the path after /api/
  const url = new URL(req.url);
  const path = url.pathname; // e.g. /api/v1/user/credits
  const search = url.search; // e.g. ?limit=10

  // Build the backend URL
  const backendUrl = `${BACKEND_URL}${path}${search}`;

  // Get the Supabase token from the custom header we set in axios interceptor
  const supabaseToken = req.headers.get("supabase-token");

  // Build headers to forward to the backend
  const headers: Record<string, string> = {
    "Content-Type": req.headers.get("content-type") || "application/json",
  };

  // Set the REAL Authorization header with the Supabase token
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

    // Get response body
    const responseBody = await response.text();

    // Build response with CORS headers
    const res = new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
    });

    // Copy relevant response headers
    response.headers.forEach((value, key) => {
      if (
        key.toLowerCase() !== "transfer-encoding" &&
        key.toLowerCase() !== "connection"
      ) {
        res.headers.set(key, value);
      }
    });

    return res;
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { detail: "Backend unavailable" },
      { status: 502 }
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
