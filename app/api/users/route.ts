import { NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL!;

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");

    const response = await fetch(`${BACKEND_URL}/users`, {
      method: "GET",
      headers: {
        Authorization: authHeader ?? "",
      },
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : [];

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error(`[API users GET ERROR]`, error);
    return NextResponse.json(
      { error: "users fetch failed" },
      { status: 500 }
    );
  }
}

