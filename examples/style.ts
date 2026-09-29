/**
 * Terminal styling for the examples.
 *
 * Uses @oakoliver/lipgloss when it is installed (`bun add -d @oakoliver/lipgloss`),
 * otherwise falls back to a tiny built-in subset of the same API that emits plain
 * truecolor ANSI. The library itself never depends on either.
 */

export type Color = string;

export interface StyleLike {
  foreground(c: Color): StyleLike;
  background(c: Color): StyleLike;
  bold(v: boolean): StyleLike;
  italic(v: boolean): StyleLike;
  strikethrough(v: boolean): StyleLike;
  border(b: unknown): StyleLike;
  borderForeground(c: Color): StyleLike;
  padding(...n: number[]): StyleLike;
  paddingTop(n: number): StyleLike;
  paddingLeft(n: number): StyleLike;
  width(n: number): StyleLike;
  render(...s: string[]): string;
}

export interface StyleApi {
  /** "lipgloss" when @oakoliver/lipgloss was loaded, "fallback" otherwise */
  engine: "lipgloss" | "fallback";
  newStyle(): StyleLike;
  roundedBorder(): unknown;
  joinHorizontal(pos: number, ...blocks: string[]): string;
  joinVertical(pos: number, ...blocks: string[]): string;
  stringWidth(s: string): number;
  truncate(s: string, w: number): string;
  blend1D(steps: number, ...stops: Color[]): Color[];
  Top: number;
  Left: number;
}

// ── fallback ────────────────────────────────────────────────────────────────

const ANSI = /\x1b\[[0-9;]*m/g;
const strip = (s: string) => s.replace(ANSI, "");

function charWidth(cp: number): number {
  if (cp === 0 || (cp >= 0x300 && cp <= 0x36f) || cp === 0x200d || (cp >= 0xfe00 && cp <= 0xfe0f)) return 0;
  const wide =
    (cp >= 0x1100 && cp <= 0x115f) || (cp >= 0x2e80 && cp <= 0x303e) || (cp >= 0x3041 && cp <= 0x33ff) ||
    (cp >= 0x3400 && cp <= 0x4dbf) || (cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0xa960 && cp <= 0xa97f) ||
    (cp >= 0xac00 && cp <= 0xd7a3) || (cp >= 0xf900 && cp <= 0xfaff) || (cp >= 0xfe30 && cp <= 0xfe4f) ||
    (cp >= 0xff00 && cp <= 0xff60) || (cp >= 0xffe0 && cp <= 0xffe6) || (cp >= 0x1f300 && cp <= 0x1faff) ||
    (cp >= 0x20000 && cp <= 0x3fffd);
  return wide ? 2 : 1;
}

function width(s: string): number {
  let w = 0;
  for (const ch of strip(s)) w += charWidth(ch.codePointAt(0)!);
  return w;
}

function truncate(s: string, max: number): string {
  let out = "", w = 0;
  for (const ch of strip(s)) {
    const cw = charWidth(ch.codePointAt(0)!);
    if (w + cw > max) break;
    out += ch; w += cw;
  }
  return out;
}

function hex(c: Color): [number, number, number] {
  const h = c.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

const padRight = (line: string, w: number) => line + " ".repeat(Math.max(0, w - width(line)));

class FallbackStyle implements StyleLike {
  private o: Record<string, any> = { pad: [0, 0, 0, 0] };
  private set(k: string, v: unknown) { const s = new FallbackStyle(); s.o = { ...this.o, [k]: v }; return s; }
  foreground(c: Color) { return this.set("fg", c); }
  background(c: Color) { return this.set("bg", c); }
  bold(v: boolean) { return this.set("bold", v); }
  italic(v: boolean) { return this.set("italic", v); }
  strikethrough(v: boolean) { return this.set("strike", v); }
  border(_b: unknown) { return this.set("border", true); }
  borderForeground(c: Color) { return this.set("bfg", c); }
  padding(...n: number[]) {
    const [t, r = t, b = t, l = r] = n;
    return this.set("pad", [t, r, b, l]);
  }
  paddingTop(n: number) { const p = [...this.o.pad]; p[0] = n; return this.set("pad", p); }
  paddingLeft(n: number) { const p = [...this.o.pad]; p[3] = n; return this.set("pad", p); }
  width(n: number) { return this.set("width", n); }

  private sgr(): string {
    const c: string[] = [];
    if (this.o.bold) c.push("1");
    if (this.o.italic) c.push("3");
    if (this.o.strike) c.push("9");
    if (this.o.fg) c.push("38;2;" + hex(this.o.fg).join(";"));
    if (this.o.bg) c.push("48;2;" + hex(this.o.bg).join(";"));
    return c.length ? `\x1b[${c.join(";")}m` : "";
  }

  render(...parts: string[]): string {
    const text = parts.join(" ");
    const sgr = this.sgr();
    const paint = (s: string) => (sgr && s ? sgr + s + "\x1b[0m" : s);
    const [pt, pr, pb, pl] = this.o.pad;
    const hasBox = this.o.border || pt || pr || pb || pl || this.o.width;
    if (!hasBox) return text.split("\n").map(paint).join("\n");

    const bw = this.o.border ? 2 : 0;
    let lines = text.split("\n");
    const natural = Math.max(...lines.map(width));
    const inner = this.o.width ? this.o.width - bw - pl - pr : natural;
    lines = [...Array(pt).fill(""), ...lines, ...Array(pb).fill("")];
    const body = lines.map((l) => " ".repeat(pl) + padRight(paint(l), inner) + " ".repeat(pr));
    if (!this.o.border) return body.join("\n");
    const bc = this.o.bfg ? `\x1b[38;2;${hex(this.o.bfg).join(";")}m` : "";
    const b = (s: string) => (bc ? bc + s + "\x1b[0m" : s);
    const w = inner + pl + pr;
    return [b("╭" + "─".repeat(w) + "╮"), ...body.map((l) => b("│") + l + b("│")), b("╰" + "─".repeat(w) + "╯")].join("\n");
  }
}

const fallback: StyleApi = {
  engine: "fallback",
  newStyle: () => new FallbackStyle(),
  roundedBorder: () => "rounded",
  joinHorizontal(_pos, ...blocks) {
    const cols = blocks.map((b) => b.split("\n"));
    const h = Math.max(...cols.map((c) => c.length));
    const ws = cols.map((c) => Math.max(...c.map(width)));
    return Array.from({ length: h }, (_, i) => cols.map((c, j) => padRight(c[i] ?? "", ws[j])).join("")).join("\n");
  },
  joinVertical(_pos, ...blocks) {
    return blocks.join("\n");
  },
  stringWidth: width,
  truncate,
  blend1D(steps, ...stops) {
    const rgb = stops.map(hex);
    return Array.from({ length: steps }, (_, i) => {
      const t = steps === 1 ? 0 : (i / (steps - 1)) * (rgb.length - 1);
      const k = Math.min(rgb.length - 2, Math.floor(t)), f = t - k;
      const c = rgb[k].map((v, j) => Math.round(v + (rgb[k + 1][j] - v) * f));
      return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
    });
  },
  Top: 0,
  Left: 0,
};

/** Load @oakoliver/lipgloss if available, else the fallback above. */
export async function loadStyle(): Promise<StyleApi> {
  if (process.env.NO_LIPGLOSS) return fallback;
  try {
    const pkg = "@oakoliver/lipgloss";
    const lg: any = await import(pkg);
    return { engine: "lipgloss", ...lg } as StyleApi;
  } catch {
    return fallback;
  }
}
