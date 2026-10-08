import Link from "next/link";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata = { title: "Yeni şifre · saas-s" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Link eksik</h1>
        <Link href="/sifremi-unuttum" className="underline">
          Yeni bir sıfırlama linki iste
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Yeni şifre belirle</h1>
      <ResetPasswordForm token={token} />
    </div>
  );
}
