import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata = { title: "Şifremi unuttum · saas-s" };

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Şifremi unuttum</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        E-posta adresini gir, şifreni sıfırlaman için bir link gönderelim.
      </p>
      <ForgotPasswordForm />
      <Link
        href="/giris"
        className="text-sm text-neutral-600 underline dark:text-neutral-400"
      >
        Girişe dön
      </Link>
    </div>
  );
}
