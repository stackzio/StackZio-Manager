import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { Logo } from "@/components/brand/logo";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-brand-gradient p-12 text-white lg:flex">
        <div>
          <Image
            src="/brand/wordmark-white.png"
            alt="StackZio"
            width={140}
            height={78}
            priority
            unoptimized
          />
        </div>
        <div className="relative z-10 space-y-4">
          <p className="text-balance text-3xl font-semibold leading-tight">
            One workspace for every agency you run.
          </p>
          <p className="max-w-md text-base text-white/85">
            Track clients, projects, payments, and meetings across StackZio and every brand you manage —
            beautifully, securely, in one place.
          </p>
        </div>
        <div className="text-xs text-white/70">© {new Date().getFullYear()} StackZio</div>
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 h-[460px] w-[460px] rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-32 h-[480px] w-[480px] rounded-full bg-amber-300/20 blur-3xl"
        />
      </div>
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
