import { Outlet } from 'react-router-dom';
import { Logo } from '../logo';
import { ThemeToggle } from '../theme-provider';
import { HeroBackground } from '../hero-background';
import { motion, useReducedMotion } from 'motion/react';
export function AuthLayout() {
  const reducedMotion = useReducedMotion();
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-black p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <HeroBackground />
        <div className="relative z-10">
          <Logo />
        </div>
        <motion.div
          className="relative z-10"
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="mb-6 font-editorial text-4xl">
            Clarity in every cycle.
          </p>
          <h2 className="hero-title max-w-lg font-heading text-7xl font-semibold">
            Business,
            <br />
            in a loop.
          </h2>
          <p className="mt-8 max-w-sm text-lg leading-relaxed text-white/70">
            Subscriptions, invoices, and payments. One connected workspace for
            your business.
          </p>
        </motion.div>
        <p className="relative z-10 text-sm text-white/70">
          Brightloop Software · Recurring made effortless.
        </p>
      </aside>
      <div className="flex flex-col">
        <header className="flex items-center justify-between p-6">
          <div className="lg:invisible">
            <Logo />
          </div>
          <ThemeToggle />
        </header>
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-auth">
            <Outlet />
          </div>
        </main>
        <footer className="p-6 text-center text-xs text-muted-foreground">
          Your subscriptions. Simplified.
        </footer>
      </div>
    </div>
  );
}
