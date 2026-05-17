import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = "http://127.0.0.1:8000";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code) {
    return NextResponse.redirect(new URL("/dashboard?error=no_code", request.url));
  }

  try {
    const response = await fetch(`${BACKEND_URL}/classroom/callback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, state }),
    });

    const data = await response.json();

    if (data.error) {
      return NextResponse.redirect(
        new URL(`/dashboard?error=${data.error}`, request.url)
      );
    }

    return NextResponse.redirect(
      new URL("/dashboard?classroom=connected", request.url)
    );
  } catch (error) {
    return NextResponse.redirect(
      new URL("/dashboard?error=callback_failed", request.url)
    );
  }
}