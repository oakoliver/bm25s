/**
 * "A search engine in a terminal": index a corpus paragraph by paragraph, time it,
 * then show ranked hits with score bars and highlighted query terms. A synthetic
 * Zipf corpus (200k docs, ~9M tokens) shows throughput at scale.
 *
 * By default the corpus is the invented "Driftwood" knowledge base from kb-corpus.ts
 * (about 300 paragraphs, seeded, no real data). Pass a folder or a .md file to search
 * your own markdown instead.
 *
 *   bun examples/search.ts                              # bundled invented knowledge base
 *   bun examples/search.ts path/to/docs -q "query one" -q "query two"
 *   bun examples/search.ts --docs 50000                 # smaller synthetic corpus
 *   bun examples/search.ts --no-scale                   # skip the synthetic corpus
 */
import { BM25, Tokenizer } from "../src/index.ts";
import { loadStyle } from "./style.ts";
import { generateKnowledgeBase } from "./kb-corpus.ts";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const { newStyle, roundedBorder, joinHorizontal, joinVertical, Top, Left, stringWidth, truncate, blend1D } = await loadStyle();

// ── arguments ────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const userQueries: string[] = [];
let target: string | undefined;
let SYN_DOCS = 200_000;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]!;
  if (a === "-q" || a === "--query") userQueries.push(argv[++i]!);
  else if (a === "--docs") SYN_DOCS = Number(argv[++i]);
  else if (a === "--no-scale") SYN_DOCS = 0;
  else target = a;
}
const QUERIES = userQueries.length
  ? userQueries
  : ["retry backoff for failed jobs", "rotate an api token", "postgresql connection pool exhausted"];

const W = 118;

// ── palette ────────────────────────────────────────────────────────────────
const C = {
  fg: "#c0caf5", dim: "#565f89", mute: "#737aa2", violet: "#bb9af7", blue: "#7aa2f7", cyan: "#7dcfff",
  green: "#9ece6a", amber: "#e0af68", pink: "#f7768e", orange: "#ff9e64", panel: "#1f2335", hl: "#3d2f5b",
};
const s = (fg: string) => newStyle().foreground(fg);
const b = (fg: string) => newStyle().foreground(fg).bold(true);

// ── corpus: the bundled knowledge base, or markdown files split into paragraphs ──
type Para = { article: string; title: string; text: string; pos: number; of: number };
const paras: Para[] = [];
function markdownFiles(p: string): string[] {
  if (statSync(p).isFile()) return [p];
  return readdirSync(p, { withFileTypes: true })
    .filter((d) => !d.name.startsWith(".") && d.name !== "node_modules" && d.name !== "dist")
    .flatMap((d) => (d.isDirectory() ? markdownFiles(join(p, d.name)) : /\.(md|markdown)$/i.test(d.name) ? [join(p, d.name)] : []))
    .sort();
}
let sourceCount: number;
if (target === undefined) {
  const kb = generateKnowledgeBase();
  sourceCount = kb.length;
  for (const doc of kb) for (const text of doc.paragraphs) paras.push({ article: doc.title, title: doc.title, text, pos: 0, of: 0 });
} else {
  const files = markdownFiles(resolve(target));
  if (files.length === 0) { console.error(`no markdown files under ${target}`); process.exit(1); }
  sourceCount = files.length;
  for (const path of files) {
    const raw = readFileSync(path, "utf8");
    const fm = raw.match(/^---\n([\s\S]*?)\n---\n/);
    const title = fm?.[1]!.match(/^title:\s*"?(.*?)"?\s*$/m)?.[1] ?? raw.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? basename(path);
    const body = (fm ? raw.slice(fm[0].length) : raw).replace(/```[\s\S]*?```/g, "\n");
    for (const p of body.split(/\n\s*\n/)) {
      const t = p.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\*\*|`|^>\s*/g, "").replace(/\s+/g, " ").trim();
      if (t.length < 40 || t.startsWith("#") || t.startsWith("|") || t === "---") continue;
      paras.push({ article: path, title, text: t, pos: 0, of: 0 });
    }
  }
}
if (paras.length === 0) { console.error("no paragraphs to index"); process.exit(1); }

{ const per = new Map<string, number>(); for (const p of paras) { p.pos = (per.get(p.article) ?? 0) + 1; per.set(p.article, p.pos); } for (const p of paras) p.of = per.get(p.article)!; }

// ── index (timed) ──────────────────────────────────────────────────────────
const texts = paras.map((p) => p.text);
// median of 3 runs (the machine is shared); the last run's index is the one queried
const median = (a: number[]) => [...a].sort((x, y) => x - y)[1];
function build(docs: string[]) {
  const a = performance.now();
  const tk = new Tokenizer({ stopwords: "en" });
  const tt = tk.tokenize(docs, { returnAs: "tuple" }) as any;
  const m = performance.now();
  const r = new BM25();
  r.index(tt);
  const e = performance.now();
  return { tk, tt, r, tokMs: m - a, idxMs: e - m };
}
const runs = [build(texts), build(texts), build(texts)];
const { tk: tok, tt: ids, r: bm25 } = runs[2];
const t0 = 0, t1 = median(runs.map((x) => x.tokMs)), t2 = t1 + median(runs.map((x) => x.idxMs));
const nTokens = ids.ids.reduce((a: number, d: number[]) => a + d.length, 0);

// ── synthetic corpus for scale ─────────────────────────────────────────────
// Deterministic PRNG + Zipf-distributed pseudo-words, 50 words per doc.
function synthetic(nDocs: number) {
  let seed = 42;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const SYL = ["ka", "lo", "mi", "ren", "tu", "sa", "vek", "no", "ri", "da", "zel", "po", "qua", "fin", "ost", "mar"];
  const VOCAB = 50_000, SYN_LEN = 50;
  const words: string[] = [];
  for (let i = 0; i < VOCAB; i++) {
    let w = "", n = i + 7;
    do { w += SYL[n % SYL.length]; n = Math.floor(n / SYL.length); } while (n > 0);
    words.push(w);
  }
  const cdf = new Float64Array(VOCAB);
  let acc = 0;
  for (let i = 0; i < VOCAB; i++) { acc += 1 / (i + 1); cdf[i] = acc; }
  const draw = () => {
    const x = rnd() * acc;
    let lo = 0, hi = VOCAB - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (cdf[m]! < x) lo = m + 1; else hi = m; }
    return words[lo]!;
  };
  const docs: string[] = new Array(nDocs);
  for (let d = 0; d < nDocs; d++) { const a: string[] = []; for (let j = 0; j < SYN_LEN; j++) a.push(draw()); docs[d] = a.join(" "); }
  const runs = [build(docs), build(docs), build(docs)];
  const { tt, r } = runs[2]!;
  const tokMs = median(runs.map((x) => x.tokMs)), idxMs = median(runs.map((x) => x.idxMs));
  const tokens = tt.ids.reduce((a: number, d: number[]) => a + d.length, 0);
  const qs: string[][] = [];
  for (let q = 0; q < 1000; q++) qs.push([draw(), draw(), draw()]);
  const q0 = performance.now();
  for (const q of qs) r.retrieve([q], { k: 10 });
  const queryMs = (performance.now() - q0) / qs.length;
  return { tokens, tokMs, idxMs, queryMs };
}
const scale = SYN_DOCS > 0 ? synthetic(SYN_DOCS) : null;

const fmt = (n: number) => n.toLocaleString("en-US");
const ms = (x: number) => (x < 10 ? x.toFixed(2) : x < 100 ? x.toFixed(1) : x.toFixed(0)) + " ms";
const mtok = (n: number, msv: number) => (n / (msv / 1000) / 1e6).toFixed(1) + "M tok/s";

// header
const logo = b(C.violet).render("bm25s") + s(C.dim).render(" · ") + s(C.fg).render("search engine in a terminal");
const ver = s(C.mute).render("TypeScript port of bm25s 0.3.11 · method=lucene k1=1.5 b=0.75");
const header = joinHorizontal(Top, logo, " ".repeat(Math.max(1, W - 2 - stringWidth(logo) - stringWidth(ver))), ver);

const stat = (label: string, value: string, color: string) =>
  newStyle().border(roundedBorder()).borderForeground(C.dim).padding(0, 1).render(
    joinVertical(Left, s(C.mute).render(label), b(color).render(value)),
  );
const rowLabel = (t: string, sub: string) => newStyle().width(12).paddingTop(1).render(joinVertical(Left, b(C.violet).render(t), s(C.dim).render(sub)));
const stats1 = joinHorizontal(Top,
  rowLabel("search", "median of 3"),
  stat("corpus", target === undefined ? `${sourceCount} kb articles` : `${sourceCount} file${sourceCount === 1 ? "" : "s"}`, C.fg), " ",
  stat("paragraphs", fmt(paras.length), C.fg), " ",
  stat("tokens", fmt(nTokens), C.fg), " ",
  stat("vocab", fmt(ids.vocab.size), C.fg), " ",
  stat("tokenize", ms(t1 - t0), C.cyan), " ",
  stat("index", ms(t2 - t1), C.cyan), " ",
  stat("total", ms(t2 - t0), C.green),
);
const secs = (x: number) => (x / 1000).toFixed(2) + " s";
const stats2 = scale && joinHorizontal(Top,
  rowLabel("scale", "median of 3"),
  stat("docs", fmt(SYN_DOCS), C.fg), " ",
  stat("tokens", fmt(scale.tokens), C.fg), " ",
  stat("tokenize", secs(scale.tokMs), C.cyan), " ",
  stat("index", secs(scale.idxMs), C.cyan), " ",
  stat("index rate", mtok(scale.tokens, scale.idxMs), C.green), " ",
  stat("end-to-end", mtok(scale.tokens, scale.tokMs + scale.idxMs), C.green), " ",
  stat("query k=10", scale.queryMs.toFixed(2) + " ms", C.amber),
);

// results
const grad = blend1D(24, "#7aa2f7", "#bb9af7", "#f7768e") as any[];
function bar(frac: number, width = 24): string {
  const full = frac * width;
  let out = "";
  for (let i = 0; i < width; i++) {
    const f = Math.max(0, Math.min(1, full - i));
    const ch = f >= 1 ? "█" : f <= 0 ? " " : "▏▎▍▌▋▊▉"[Math.min(6, Math.floor(f * 8) - 1)] ?? " ";
    out += i < full ? newStyle().foreground(grad[i]).render(ch) : s("#2a2e42").render("━");
  }
  return out;
}

function snippet(text: string, qset: Set<string>, width: number, lines = 2): string[] {
  // pick the window holding the most query-term hits, then word-wrap it into `lines` lines
  const words = text.split(" ");
  const isHit = (w: string) => [...w.matchAll(/[\p{L}\p{N}_]{2,}/gu)].some((m) => qset.has(m[0].toLowerCase()));
  const budget = width * lines - 12;
  let best = 0, bestN = -1;
  for (let i = 0; i < words.length; i++) {
    if (!isHit(words[i])) continue;
    const st = Math.max(0, i - 3);
    let len = 0, n = 0;
    for (let j = st; j < words.length && len + words[j].length < budget; j++) { len += words[j].length + 1; if (isHit(words[j])) n++; }
    if (n > bestN) { bestN = n; best = st; }
  }
  const out: string[] = [];
  let cur = best > 0 ? s(C.dim).render("…") : "", curW = best > 0 ? 1 : 0, i = best;
  const paint = (w: string) => w.replace(/[\p{L}\p{N}_]{2,}/gu, (m) => "\u0000" + m + "\u0001").split(/(\u0000[^\u0001]*\u0001)/).map((part) =>
    part.startsWith("\u0000") ? (qset.has(part.slice(1, -1).toLowerCase()) ? newStyle().foreground("#1a1b26").background(C.amber).bold(true).render(part.slice(1, -1)) : s(C.fg).render(part.slice(1, -1))) : s(C.fg).render(part)).join("");
  while (i < words.length && out.length < lines) {
    const w = words[i];
    if (curW + w.length + (curW ? 1 : 0) > width - (out.length === lines - 1 ? 2 : 0)) { out.push(cur); cur = ""; curW = 0; continue; }
    cur += (curW ? " " : "") + paint(w); curW += w.length + (curW ? 1 : 0); i++;
  }
  if (out.length < lines && cur) out.push(cur + (i < words.length ? s(C.dim).render(" …") : ""));
  else if (i < words.length) out[out.length - 1] += s(C.dim).render(" …");
  return out;
}

const blocks: string[] = [];
for (const q of QUERIES) {
  const qt0 = performance.now();
  const qTokens = (tok.tokenize([q], { updateVocab: false, returnAs: "tuple" }) as any);
  const inv = new Map<number, string>(); for (const [w, i] of qTokens.vocab) inv.set(i, w);
  const terms = qTokens.ids[0].map((i: number) => inv.get(i)!);
  const res = (terms.length ? bm25.retrieve([terms], { k: Math.min(40, paras.length) }) : { documents: [[]], scores: [[]] }) as any;
  const qt1 = performance.now();
  const qset = new Set<string>(terms);
  // best paragraph per article, top 3 articles
  const seen = new Set<string>(); const docs: number[] = []; const scores: number[] = [];
  (res.documents[0] as number[]).forEach((d, i) => { if (docs.length < 3 && res.scores[0][i] > 0 && !seen.has(paras[d].article)) { seen.add(paras[d].article); docs.push(d); scores.push(res.scores[0][i]); } });
  const top = scores[0] || 1;
  const head =
    b(C.pink).render("❯ ") + b(C.fg).render(q) + "  " +
    terms.map((t: string) => newStyle().foreground(C.cyan).background("#24283b").render(` ${t} `)).join(" ") +
    s(C.dim).render(`  ${(qt1 - qt0).toFixed(2)} ms`);
  const rows = [head];
  docs.forEach((d, r) => {
    const p = paras[d];
    const rank = b(r === 0 ? C.amber : C.mute).render(`${r + 1}`);
    const score = b(C.fg).render(scores[r].toFixed(3).padStart(6));
    const loc = s(C.dim).render(` ¶${p.pos}/${p.of}`);
    const title = truncate(p.title, W - 46 - stringWidth(loc)) ;
    rows.push(`  ${rank}  ${score} ${bar(scores[r] / top)}  ${b(C.blue).render(title)}${loc}`);
    for (const l of snippet(p.text, qset, W - 44)) rows.push(" ".repeat(38) + l);
  });
  if (docs.length === 0) rows.push(s(C.dim).render("     no matching paragraphs"));
  blocks.push(rows.join("\n"));
}

const panel = (body: string) =>
  newStyle().border(roundedBorder()).borderForeground(C.violet).padding(0, 1).width(W).render(body);

console.log(
  joinVertical(Left,
    header,
    "",
    stats1,
    ...(stats2 ? [stats2] : []),
    "",
    panel(blocks.join("\n\n")),
  ),
);
