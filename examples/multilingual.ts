/**
 * Multilingual retrieval: queries in Korean, Danish, French, Chinese, German, Russian,
 * Spanish and English against a small bundled corpus (multilingual-corpus.json).
 * Shows each query's tokens (Unicode splitter, stopwords struck through) and top hits.
 *
 * If Python bm25s is importable, every score is cross-checked against it (py_scores.py)
 * and a parity column is shown. Choose the interpreter with BM25S_PYTHON (default python3).
 *
 *   bun examples/multilingual.ts
 *   BM25S_PYTHON=.venv/bin/python bun examples/multilingual.ts
 */
import { BM25, Tokenizer, STOPWORDS_MAP, defaultSplitter } from "../src/index.ts";
import { loadStyle } from "./style.ts";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const { newStyle, roundedBorder, joinVertical, Left, stringWidth, truncate } = await loadStyle();

const HERE = dirname(fileURLToPath(import.meta.url));
const CORPUS_FILE = join(HERE, "multilingual-corpus.json");
const data = JSON.parse(readFileSync(CORPUS_FILE, "utf8")) as {
  docs: { lang: string; text: string }[];
  queries: { lang: string; text: string }[];
};

const W = 120;
const C = {
  fg: "#c0caf5", dim: "#565f89", mute: "#737aa2", violet: "#bb9af7", blue: "#7aa2f7", cyan: "#7dcfff",
  green: "#9ece6a", amber: "#e0af68", pink: "#f7768e", orange: "#ff9e64", teal: "#73daca",
};
const s = (fg: string) => newStyle().foreground(fg);
const b = (fg: string) => newStyle().foreground(fg).bold(true);

// stopwords: the union of all 15 lists
const LISTS = ["en", "en_plus", "de", "fr", "es", "pt", "it", "nl", "ru", "sv", "no", "zh", "tr", "ko", "da"];
const union = [...new Set(LISTS.flatMap((l) => STOPWORDS_MAP[l] as string[]))];
const swSet = new Set(union);

const corpus = data.docs.map((d) => d.text);
const tok = new Tokenizer({ stopwords: union });
const t0 = performance.now();
const ids = tok.tokenize(corpus, { returnAs: "tuple" });
const bm = new BM25(); // lucene, k1=1.5, b=0.75
bm.index(ids);
const t1 = performance.now();

// ── optional Python cross-check ──────────────────────────────────────────────
type PyResult = { version: string; stopwords: number; queries: { tokens: string[]; scores: number[] }[] };
const PYTHON = process.env.BM25S_PYTHON || "python3";
let py: PyResult | null = null;
let pyNote = "";
const probe = spawnSync(PYTHON, ["-c", "import bm25s; print(bm25s.__version__)"], { encoding: "utf8" });
const REF_VERSION = "0.3.11"; // the upstream release this port is synced with
const found = probe.status === 0 ? probe.stdout.trim() : "";
if (found && found !== REF_VERSION) {
  pyNote = `Python cross-check skipped: \`${PYTHON}\` has bm25s ${found}, parity is defined against ${REF_VERSION}. pip install bm25s==${REF_VERSION}, or set BM25S_PYTHON.`;
} else if (found) {
  const run = spawnSync(PYTHON, [join(HERE, "py_scores.py"), CORPUS_FILE], { encoding: "utf8", maxBuffer: 16 << 20 });
  if (run.status === 0) py = JSON.parse(run.stdout);
  else pyNote = `Python cross-check failed: ${run.stderr.trim().split("\n").pop()}`;
} else {
  pyNote = `Python cross-check skipped: \`${PYTHON}\` cannot import bm25s. pip install bm25s==${REF_VERSION}, or set BM25S_PYTHON.`;
}

const LANG_COLOR: Record<string, string> = { ko: "#f7768e", da: "#ff9e64", fr: "#7aa2f7", zh: "#e0af68", de: "#9ece6a", ru: "#7dcfff", es: "#bb9af7", en: "#c0caf5" };
const badge = (l: string) => newStyle().foreground("#1a1b26").background(LANG_COLOR[l] ?? C.mute).bold(true).render(` ${l.toUpperCase()} `);

let maxDelta = 0, compared = 0, tokenMatch = 0;
const cards: string[] = [];
data.queries.forEach(({ lang, text: q }, qi) => {
  // our tokenization of the query, showing which words the stopword filter drops
  const words = defaultSplitter(q.toLowerCase());
  const kept = words.filter((w) => !swSet.has(w));
  const res = bm.retrieve([kept], { k: corpus.length }) as { documents: number[][]; scores: Float64Array[] };
  const ours = new Float64Array(corpus.length);
  res.documents[0]!.forEach((d, i) => (ours[d] = res.scores[0]![i]!));
  const ref = py?.queries[qi]!.scores;
  if (ref) for (let d = 0; d < corpus.length; d++) { maxDelta = Math.max(maxDelta, Math.abs(ours[d]! - ref[d]!)); compared++; }
  const sameTokens = py ? JSON.stringify(py.queries[qi]!.tokens) === JSON.stringify(kept) : false;
  if (sameTokens) tokenMatch++;

  const chips = words.map((w) => swSet.has(w)
    ? newStyle().foreground(C.dim).strikethrough(true).render(w)
    : newStyle().foreground(C.cyan).background("#24283b").render(` ${w} `)).join(" ");
  const parityTag = !py ? "" : sameTokens ? s(C.green).render("= python") : s(C.pink).render("≠ python " + JSON.stringify(py.queries[qi]!.tokens));
  const lines = [
    `${badge(lang)} ${b(C.fg).render(q)}`,
    `     ${s(C.mute).render("tokens")}  ${chips}   ${parityTag}`,
  ];
  res.documents[0]!.slice(0, 2).forEach((d, r) => {
    if (ours[d]! <= 0) return;
    const dl = data.docs[d]!.lang;
    const text = truncate(corpus[d]!, 58);
    const pad = " ".repeat(Math.max(0, 58 - stringWidth(text)));
    let line =
      `     ${s(r === 0 ? C.amber : C.dim).render(r === 0 ? "top " : "2nd ")} ${s(C.dim).render(`#${String(d).padStart(2, "0")} ${dl}`)}  ${s(r === 0 ? C.fg : C.mute).render(text)}${pad}  ` +
      `${s(C.mute).render("ts")} ${b(C.fg).render(ours[d]!.toFixed(5))}`;
    if (ref) {
      const delta = Math.abs(ours[d]! - ref[d]!);
      line += `  ${s(C.mute).render("py")} ${b(C.teal).render(ref[d]!.toFixed(5))}  ` +
        (delta < 5e-6 ? s(C.green).render("✓") : s(C.pink).render(`Δ ${delta.toExponential(1)}`));
    }
    lines.push(line);
  });
  cards.push(lines.join("\n"));
});

const langs = new Set(data.docs.map((d) => d.lang)).size;
const title = b(C.violet).render("bm25s") + s(C.dim).render(" · ") +
  s(C.fg).render(py ? "multilingual retrieval, TypeScript vs Python" : "multilingual retrieval");
const meta = s(C.mute).render(py ? `ours: bm25s TS port  ·  reference: python bm25s ${py.version}` : "bm25s TS port · python cross-check off");
const header = title + " ".repeat(Math.max(1, W - stringWidth(title) - stringWidth(meta))) + meta;

const pill = (label: string, value: string, color: string) => s(C.mute).render(label + " ") + b(color).render(value);
const sep = s(C.dim).render("  │  ");
const facts = [
  pill("corpus", `${corpus.length} docs, ${langs} langs`, C.fg),
  pill("stopwords", `${LISTS.length} lists, ${union.length.toLocaleString("en-US")} words` + (py ? ` (py ${py.stopwords.toLocaleString("en-US")})` : ""), C.fg),
  pill("splitter", "[\\p{L}\\p{N}_]{2,} ≡ (?u)\\b\\w\\w+\\b", C.cyan),
].join(sep);

const panel = newStyle().border(roundedBorder()).borderForeground(C.violet).padding(0, 1).width(W).render(cards.join("\n\n"));

const footer = py
  ? joinVertical(Left,
    (maxDelta < 5e-6 ? b(C.green).render(" ✓ parity with python bm25s " + py.version) : b(C.pink).render(" ✗ mismatch with python bm25s " + py.version)) +
      s(C.dim).render("   method=lucene k1=1.5 b=0.75 · index built in ") + s(C.fg).render(`${(t1 - t0).toFixed(2)} ms`),
    s(C.fg).render(`   ${compared} scores compared (every doc × every query) · max |ts − py| = `) +
      b(maxDelta < 5e-6 ? C.green : C.pink).render(maxDelta.toExponential(2)) +
      s(C.fg).render(" · query tokens identical ") + b(C.green).render(`${tokenMatch}/${data.queries.length}`))
  : joinVertical(Left,
    s(C.dim).render("   method=lucene k1=1.5 b=0.75 · index built in ") + s(C.fg).render(`${(t1 - t0).toFixed(2)} ms`),
    s(C.amber).render("   " + pyNote.replace(/\. /g, ".\n   ")));

console.log(joinVertical(Left, header, "", facts, "", panel, footer));
if (py && maxDelta >= 5e-6) process.exitCode = 1;
