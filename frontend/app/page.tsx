"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, ArrowRight, Zap, LineChart, KeyRound } from "lucide-react";

export default function HomePage() {
    const { isSignedIn, isLoaded } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isLoaded && isSignedIn) {
            router.push("/dashboard");
        }
    }, [isLoaded, isSignedIn, router]);

    return (
        <div className="min-h-screen bg-black text-zinc-100 flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-200">
            {/* Navigation Header */}
            <header className="border-b border-zinc-800/80 px-6 py-4 flex items-center justify-between max-w-7xl w-full mx-auto">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <ShieldAlert className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-lg text-zinc-100 tracking-tight flex items-center gap-1.5">
                        Crashly
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href="/sign-in"
                        className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
                    >
                        Sign In
                    </Link>
                    <Link
                        href="/sign-up"
                        className="px-4 py-2 text-sm font-medium text-black bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors font-semibold"
                    >
                        Get Started
                    </Link>
                </div>
            </header>

            {/* Hero Section */}
            <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center max-w-4xl mx-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 mb-8 font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Production-grade error monitoring for modern apps
                </div>

                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6">
                    Track crashes in real time. <br />
                    <span className="text-transparent bg-clip-text bg-linear-to-r from-emerald-400 via-teal-300 to-cyan-400">
                        Resolve before users notice.
                    </span>
                </h1>

                <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-10 leading-relaxed">
                    Automatic error fingerprinting, intelligent grouping, trend analysis,
                    and instant developer telemetry in a lightning-fast dark dashboard.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <Link
                        href="/sign-in"
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-base transition-all shadow-lg shadow-emerald-500/20"
                    >
                        <span>Open Dashboard</span>
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                        href="/sign-up"
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 font-medium text-base transition-colors"
                    >
                        Create Free Account
                    </Link>
                </div>

                {/* Feature highlights */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 text-left w-full">
                    <div className="p-6 rounded-xl bg-zinc-950/80 border border-zinc-850 hover:border-zinc-800 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                            <Zap className="w-5 h-5" />
                        </div>
                        <h3 className="font-semibold text-zinc-100 text-base mb-1">Fingerprinted Grouping</h3>
                        <p className="text-sm text-zinc-400 leading-relaxed">
                            Similar stack traces are deduplicated and tracked as high-level error classes automatically.
                        </p>
                    </div>

                    <div className="p-6 rounded-xl bg-zinc-950/80 border border-zinc-850 hover:border-zinc-800 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-4">
                            <LineChart className="w-5 h-5" />
                        </div>
                        <h3 className="font-semibold text-zinc-100 text-base mb-1">Time-Series Trends</h3>
                        <p className="text-sm text-zinc-400 leading-relaxed">
                            Monitor 24-hour and 7-day volume patterns with hourly and daily buckets.
                        </p>
                    </div>

                    <div className="p-6 rounded-xl bg-zinc-950/80 border border-zinc-850 hover:border-zinc-800 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
                            <KeyRound className="w-5 h-5" />
                        </div>
                        <h3 className="font-semibold text-zinc-100 text-base mb-1">Secure Scoped Keys</h3>
                        <p className="text-sm text-zinc-400 leading-relaxed">
                            Project-specific hashed API keys with one-time secrets and instant revocation.
                        </p>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-400">
                Crashly Developer Error Monitoring © 2026
            </footer>
        </div>
    );
}
