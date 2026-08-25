"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label="Toggle theme"
      onClick={() => {
        const root = document.documentElement;
        const next = root.classList.contains("dark") ? "light" : "dark";
        root.classList.toggle("dark", next === "dark");
        localStorage.setItem("theme", next);
      }}
    >
      <Sun className="hidden size-4 dark:block" />
      <Moon className="size-4 dark:hidden" />
    </Button>
  );
}
