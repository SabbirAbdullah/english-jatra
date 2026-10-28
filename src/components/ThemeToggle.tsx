"use client";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const toggle = () => {
    const dark = document.documentElement.classList.toggle("dark");
    document.cookie = `theme=${dark ? "dark" : "light"}; path=/; max-age=31536000; samesite=lax`;
  };
  return <button onClick={toggle} className="btn-ghost !px-2.5 !py-1.5" aria-label="Toggle light or dark theme"><Sun size={16} className="hidden dark:block" /><Moon size={16} className="dark:hidden" /></button>;
}
