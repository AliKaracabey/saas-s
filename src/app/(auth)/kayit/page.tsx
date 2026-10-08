import Link from "next/link";
import { SignUpForm } from "./sign-up-form";

export const metadata = { title: "Kayıt ol · saas-s" };

export default function SignUpPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Hesap oluştur</h1>
      <SignUpForm />
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Zaten hesabın var mı?{" "}
        <Link href="/giris" className="font-medium underline">
          Giriş yap
        </Link>
      </p>
    </div>
  );
}
