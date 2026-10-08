import Link from "next/link";
import { SignInForm } from "./sign-in-form";

export const metadata = { title: "Giriş yap · saas-s" };

export default function SignInPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Giriş yap</h1>
      <SignInForm />
      <div className="flex justify-between text-sm text-neutral-600 dark:text-neutral-400">
        <Link href="/sifremi-unuttum" className="underline">
          Şifremi unuttum
        </Link>
        <Link href="/kayit" className="font-medium underline">
          Kayıt ol
        </Link>
      </div>
    </div>
  );
}
