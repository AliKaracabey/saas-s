import { NextResponse, type NextRequest } from "next/server";
import { verifyEmail } from "@/lib/auth/account";

// E-postadaki doğrulama linki buraya gelir.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const ok = token ? await verifyEmail(token) : false;

  const target = new URL("/panel", request.nextUrl);
  target.searchParams.set("dogrulama", ok ? "basarili" : "gecersiz");
  return NextResponse.redirect(target);
}
