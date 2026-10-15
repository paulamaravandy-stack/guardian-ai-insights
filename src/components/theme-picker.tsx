import { useEffect, useState } from "react";
import { Palette } from "lucide-react";

const THEMES = [
  { id: "emerald", label: "Emerald", swatch: "oklch(0.72 0.17 162)" },
  { id: "ocean", label: "Ocean", swatch: "oklch(0.7 0.15 235)" },
  { id: "royal", label: "Royal", swatch: "oklch(0.68 0.18 295)" },
  { id: "sunset", label: "Sunset", swatch: "oklch(0.72 0.17 45)" },
  { id: "rose", label: "Rose", swatch: "oklch(0.7 0.18 10)" },
  { id: "light", label: "Light", swatch: "oklch(0.97 0.01 250)" },
] as const;

const KEY = "osusuguard-theme";

function apply(id: string) {
  if (id === "emerald") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", id);
}

export function ThemePicker() {
  const [theme, setTheme] = useState("emerald");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(KEY) ?? "emerald";
    setTheme(saved);
    apply(saved);
  }, []);

  const choose = (id: string) => {
    setTheme(id);
    apply(id);
    localStorage.setItem(KEY, id);
  };

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
      >
        <Palette className="h-4 w-4" /> Theme
      </button>
      {open && (
        <div className="grid grid-cols-6 gap-2 px-3 py-2">
          {THEMES.map((t) => (
            <button
              key={t.id}
              title={t.label}
              aria-label={`${t.label} theme`}
              onClick={() => choose(t.id)}
              style={{ background: t.swatch }}
              className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${
                theme === t.id ? "border-foreground" : "border-transparent"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
