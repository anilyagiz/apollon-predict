"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  BrainCog,
  Vote,
  Activity,
  Menu,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/swap", label: "Token Swap", icon: ArrowLeftRight },
  { href: "/agent", label: "Oracle Agent", icon: BrainCog },
  { href: "/dao", label: "DAO Forum", icon: Vote },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl border-b border-purple-500/10 bg-[#0E0514]/80">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/apollon_logo.jpg"
              alt="Apollon"
              width={36}
              height={36}
              className="rounded-xl shadow-lg shadow-purple-500/20"
              priority
            />
            <div>
              <span className="text-lg font-bold text-white tracking-tight">
                Apollon
              </span>
              <span className="text-[10px] text-purple-300/50 block -mt-1 font-medium tracking-wider uppercase">
                ZK Oracle
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-purple-500/15 text-purple-200 border border-purple-500/20 shadow-lg shadow-purple-500/5"
                      : "text-gray-400 hover:text-purple-200 hover:bg-purple-500/5"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-purple-400" : ""}`} />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Status Indicator */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/8 border border-emerald-500/15">
              <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400 font-medium">Live</span>
            </div>
          </div>

          {/* Mobile Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-gray-400 hover:text-purple-300 p-2"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="md:hidden pb-4 space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-purple-500/15 text-purple-200 border border-purple-500/20"
                      : "text-gray-400 hover:text-purple-200 hover:bg-purple-500/5"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
