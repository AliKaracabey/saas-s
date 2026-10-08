import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "session";
const THIRTY_DAYS_IN_SECONDS = 30 * 24 * 60 * 60;

/*
 * Her istekten önce çalışır.
 *
 * 1. CSRF koruması: Çerez taşıyan ve veri değiştiren (GET dışındaki) her
 *    istek, kendi sitemizden gelmek zorunda. Başka bir site kullanıcının
 *    tarayıcısına bizim adımıza form gönderttiremez. (Next.js server
 *    action'ları bunu zaten yapıyor; bu kural ileride ekleyeceğimiz API
 *    route'larını da kapsar.)
 * 2. Oturum çerezinin süresini uzatma: Server component'ler çerez yazamaz.
 *    Veritabanındaki oturum session.ts içinde uzatılıyor; çerezin kendisini
 *    de burada, her sayfa açılışında 30 güne uzatıyoruz.
 */
export function middleware(request: NextRequest) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    const origin = request.headers.get("origin");
    const host =
      request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    if (!origin || !host || new URL(origin).host !== host) {
      return new NextResponse(null, { status: 403 });
    }
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: THIRTY_DAYS_IN_SECONDS,
    });
  }
  return response;
}

export const config = {
  // Statik dosyalar için çalışmasına gerek yok.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
