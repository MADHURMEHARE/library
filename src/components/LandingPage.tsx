/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  ArrowRight, CalendarCheck, Grid3x3, IndianRupee, MessageSquareText,
  ShieldCheck, Sun, Moon, CheckCircle2, Quote,
} from "lucide-react";

interface LandingPageProps {
  onGetStarted: () => void;
  darkMode: boolean;
  setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
}

const seatGrid = Array.from({ length: 48 }, (_, i) => i);
// Deterministic "occupied" pattern so the hero graphic looks alive without random flicker on re-render
const occupied = new Set([2, 5, 9, 11, 14, 18, 21, 23, 27, 30, 33, 36, 39, 41, 44]);

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, darkMode, setDarkMode }) => {
  return (
    <div className="min-h-screen relative overflow-hidden text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950">
      {/* Ambient gradient mesh backdrop — fixed so it stays put behind every glass panel while scrolling */}
      <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute top-[-10%] left-[-5%] h-[32rem] w-[32rem] rounded-full bg-indigo-400/40 dark:bg-indigo-600/25 blur-3xl" />
        <div className="absolute top-[15%] right-[-10%] h-[28rem] w-[28rem] rounded-full bg-violet-400/35 dark:bg-violet-600/20 blur-3xl" />
        <div className="absolute bottom-[-15%] left-[20%] h-[30rem] w-[30rem] rounded-full bg-sky-300/35 dark:bg-sky-600/15 blur-3xl" />
        <div className="absolute bottom-[5%] right-[10%] h-[22rem] w-[22rem] rounded-full bg-emerald-300/20 dark:bg-emerald-600/10 blur-3xl" />
      </div>

      {/* Nav — glass bar */}
      <header className="sticky top-0 z-40 border-b border-white/40 dark:border-white/10 bg-white/50 dark:bg-slate-950/40 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-display font-extrabold text-base flex items-center justify-center shadow-lg shadow-indigo-500/30">
              Ω
            </div>
            <span className="font-display font-bold text-sm tracking-tight">Reading Room</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="rounded-lg p-2 border border-white/50 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-md text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 transition"
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={onGetStarted}
              className="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 transition"
            >
              Sign in
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-14 pb-16 sm:pt-20 sm:pb-24 grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/60 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-md px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 shadow-sm">
            Built for reading rooms &amp; study libraries
          </span>

          <h1 className="mt-5 font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight leading-[1.1]">
            Run your reading room like a business,{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-500 dark:from-indigo-400 dark:via-violet-400 dark:to-sky-400 bg-clip-text text-transparent">
              not a register.
            </span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-lg">
            Seat maps, membership renewals, attendance and cash collection — in one dashboard
            your front desk can actually use between walk-ins.
          </p>

          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <button
              onClick={onGetStarted}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 transition shadow-xl shadow-indigo-500/30"
            >
              Get started
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={onGetStarted}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/60 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-md px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 transition shadow-sm"
            >
              Sign in to Workspace
            </button>
          </div>

          <div className="mt-8 flex items-center gap-5 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> No setup fee</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Works on any phone</span>
          </div>
        </div>

        {/* Signature visual: glass seat-map panel */}
        <div className="relative">
          <div className="rounded-3xl border border-white/60 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-xl backdrop-saturate-150 shadow-2xl shadow-indigo-500/10 dark:shadow-black/40 p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Hall A · Live Seat Map</span>
              <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> 33 available
              </span>
            </div>
            <div className="grid grid-cols-8 gap-2">
              {seatGrid.map((i) => (
                <div
                  key={i}
                  className={`aspect-square rounded-md border ${
                    occupied.has(i)
                      ? "bg-rose-300/50 dark:bg-rose-500/30 border-rose-300/60 dark:border-rose-500/30"
                      : "bg-emerald-300/50 dark:bg-emerald-500/25 border-emerald-300/60 dark:border-emerald-500/30"
                  }`}
                  aria-hidden="true"
                />
              ))}
            </div>
            <div className="mt-4 flex items-center gap-4 text-[10px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-emerald-300/70 dark:bg-emerald-500/40" /> Available</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-rose-300/70 dark:bg-rose-500/40" /> Occupied</span>
            </div>
          </div>
          {/* Floating accent orb tucked behind the glass panel */}
          <div className="absolute -z-10 -bottom-8 -right-8 h-44 w-44 rounded-full bg-gradient-to-br from-indigo-400/50 to-violet-400/50 dark:from-indigo-500/25 dark:to-violet-500/25 blur-3xl" aria-hidden="true" />
        </div>
      </section>

      {/* Feature grid — glass cards */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
        <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-center max-w-xl mx-auto">
          Everything your front desk needs, nothing it doesn't
        </h2>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { icon: Grid3x3, title: "Visual seat maps", body: "See every hall at a glance and assign seats in two taps, not a paper register." },
            { icon: CalendarCheck, title: "Renewals that don't slip", body: "Automatic expiry tracking flags who's due before they walk out the door." },
            { icon: IndianRupee, title: "Cashier & expenses", body: "Log collections and outgoings in the same place you manage memberships." },
            { icon: MessageSquareText, title: "WhatsApp renewal nudges", body: "Send renewal reminders where students actually read them." },
            { icon: ShieldCheck, title: "Role-based access", body: "Receptionists see the front desk. Owners see the business." },
            { icon: CalendarCheck, title: "Attendance logs", body: "Daily check-in history for every seat, searchable in seconds." },
          ].map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="group rounded-2xl border border-white/60 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-xl p-5 shadow-lg shadow-indigo-500/5 dark:shadow-black/20 hover:bg-white/60 dark:hover:bg-white/10 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/15 transition-all duration-300"
            >
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center mb-3.5 shadow-md shadow-indigo-500/30 group-hover:scale-105 transition-transform duration-300">
                <Icon className="h-[18px] w-[18px]" />
              </div>
              <h3 className="font-bold text-sm">{title}</h3>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Social proof — glass quote panel over the gradient mesh */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
        <div className="rounded-3xl border border-white/60 dark:border-white/10 bg-gradient-to-br from-indigo-600/90 to-violet-600/90 dark:from-indigo-700/70 dark:to-violet-800/70 backdrop-blur-xl px-6 py-10 sm:px-12 sm:py-14 text-white relative overflow-hidden shadow-2xl shadow-indigo-500/30">
          <Quote className="absolute -top-2 -left-2 h-24 w-24 text-white/15" aria-hidden="true" />
          <div className="relative max-w-2xl">
            <p className="font-display text-lg sm:text-xl font-semibold leading-snug">
              "Renewals used to live in a notebook. Now the dashboard tells me who's expiring before they do."
            </p>
            <p className="mt-4 text-xs font-semibold text-indigo-100">
              Athena Reading Room · Owner
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-20 text-center">
        <div className="rounded-3xl border border-white/60 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-xl p-10 sm:p-14 shadow-xl shadow-indigo-500/10 dark:shadow-black/20">
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">Ready to see it running your hall?</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Sandbox logins are available — no setup required to look around.</p>
          <button
            onClick={onGetStarted}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-sm font-semibold text-white hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 transition shadow-xl shadow-indigo-500/30"
          >
            Sign in to OmniPass <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/40 dark:border-white/10 bg-white/30 dark:bg-slate-950/30 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-500">
          <span>© {new Date().getFullYear()} OmniPass. All rights reserved.</span>
          <span>Built for reading rooms across India.</span>
        </div>
      </footer>
    </div>
  );
};