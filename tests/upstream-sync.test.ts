/**
 * Tests for changes synced from upstream Python bm25s (0.3.2 -> 0.3.11),
 * plus parity fixes found while verifying against upstream.
 *
 * Expected values below were produced by Python bm25s 0.3.11.
 */
import { describe, it, expect, afterAll } from "bun:test";
import { rmSync } from "fs";
import {
  BM25,
  tokenize,
  Tokenizer,
  convertTokenizedToStrings,
  defaultSplitter,
  getStopwords,
  STOPWORDS_MAP,
  STOPWORDS_EN,
  STOPWORDS_EN_PLUS,
  STOPWORDS_GERMAN,
  STOPWORDS_FRENCH,
  STOPWORDS_SPANISH,
  STOPWORDS_PORTUGUESE,
  STOPWORDS_ITALIAN,
  STOPWORDS_DUTCH,
  STOPWORDS_RUSSIAN,
  STOPWORDS_SWEDISH,
  STOPWORDS_NORWEGIAN,
  STOPWORDS_CHINESE,
  STOPWORDS_TURKISH,
  STOPWORDS_KOREAN,
  STOPWORDS_DANISH,
  type BM25Method,
  type Tokenized,
} from "../src";

const toStrings = (texts: string[], stopwords: any) =>
  convertTokenizedToStrings(tokenize(texts, { stopwords }) as Tokenized);

describe("Korean stopwords (upstream 0.3.4)", () => {
  it("resolves 'ko' and 'korean' to the upstream list", () => {
    expect(STOPWORDS_KOREAN.length).toBe(499);
    expect(STOPWORDS_MAP.ko).toBe(STOPWORDS_KOREAN);
    expect(STOPWORDS_MAP.korean).toBe(STOPWORDS_KOREAN);
    expect(getStopwords("ko").has("그리고")).toBe(true);
    expect(getStopwords("KOREAN").size).toBe(499);
  });

  it("removes Korean stopwords during tokenization", () => {
    const text = ["나는 그리고 학교에 갔다 그래서 공부를 했다"];
    expect(toStrings(text, "ko")).toEqual([["나는", "학교에", "갔다", "공부를", "했다"]]);
    expect(toStrings(text, false)[0]).toContain("그리고");
  });
});

describe("Danish stopwords (upstream 0.3.11)", () => {
  it("resolves 'da' and 'danish' to the upstream list", () => {
    expect(STOPWORDS_DANISH.length).toBe(122);
    expect(STOPWORDS_MAP.da).toBe(STOPWORDS_DANISH);
    expect(STOPWORDS_MAP.danish).toBe(STOPWORDS_DANISH);
    expect(getStopwords("da").has("også")).toBe(true);
  });

  it("removes Danish stopwords during tokenization", () => {
    const text = ["Jeg har været på en tur, og det var også godt for både mig og dig"];
    expect(toStrings(text, "da")).toEqual([["tur", "godt"]]);
  });

  it("still rejects unknown languages", () => {
    expect(() => new Tokenizer({ stopwords: "xx" })).toThrow(/Unknown stopwords language/);
  });
});

describe("Stopword lists match upstream bm25s verbatim", () => {
  it("has upstream list sizes", () => {
    const sizes: [readonly string[], number][] = [
      [STOPWORDS_EN, 33],
      [STOPWORDS_EN_PLUS, 179],
      [STOPWORDS_GERMAN, 232],
      [STOPWORDS_FRENCH, 157],
      [STOPWORDS_SPANISH, 313],
      [STOPWORDS_PORTUGUESE, 207],
      [STOPWORDS_ITALIAN, 279],
      [STOPWORDS_DUTCH, 101],
      [STOPWORDS_RUSSIAN, 151],
      [STOPWORDS_SWEDISH, 114],
      [STOPWORDS_NORWEGIAN, 172],
      [STOPWORDS_CHINESE, 841],
      [STOPWORDS_TURKISH, 162],
    ];
    for (const [list, n] of sizes) {
      expect(list.length).toBe(n);
      expect(new Set(list).size).toBe(n);
    }
  });

  it("uses the upstream (Lucene) default English list", () => {
    // Same output as bm25s.tokenize(..., stopwords="en")
    expect(toStrings(["a bird is a beautiful animal that can fly"], "en")).toEqual([
      ["bird", "beautiful", "animal", "can", "fly"],
    ]);
    // en_plus is the larger list and does drop "can"
    expect(toStrings(["a bird is a beautiful animal that can fly"], "en_plus")).toEqual([
      ["bird", "beautiful", "animal", "fly"],
    ]);
  });
});

describe("Default splitter matches Python's Unicode r'(?u)\\b\\w\\w+\\b'", () => {
  it("keeps accented, CJK and Hangul words intact", () => {
    expect(defaultSplitter("café crème: naïve señor über straße — 東京 タワー")).toEqual([
      "café", "crème", "naïve", "señor", "über", "straße", "東京", "タワー",
    ]);
    expect(defaultSplitter("학교에 갔다")).toEqual(["학교에", "갔다"]);
  });

  it("drops single-character words and splits on punctuation", () => {
    expect(defaultSplitter("x y z single letters only a b")).toEqual(["single", "letters", "only"]);
    expect(defaultSplitter("don't stop x2 y_z __")).toEqual(["don", "stop", "x2", "y_z", "__"]);
  });
});

describe("Score parity with Python bm25s 0.3.11 (stopwords='en')", () => {
  const corpus = [
    "a cat is a feline and likes to purr",
    "a dog is the human's best friend and loves to play",
    "a bird is a beautiful animal that can fly",
    "a fish is a creature that lives in water and swims",
    "Café crème with a naïve señor in the straße",
  ];
  const queries = ["does the fish purr like a cat?", "café friend that can fly"];
  const expected: Record<BM25Method, number[][]> = {
    robertson: [[0.965813, 0.0, 0.0, 0.439445, 0.0], [0.0, 0.40316, 0.87889, 0.0, 0.439445]],
    lucene: [[1.21872, 0.0, 0.0, 0.554518, 0.0], [0.0, 0.508732, 1.109035, 0.0, 0.554518]],
    atire: [[3.537226, 0.0, 0.0, 1.609438, 0.0], [0.0, 1.476549, 3.218876, 0.0, 1.609438]],
    bm25l: [[4.524711, 2.599302, 2.599302, 3.465736, 2.599302], [3.465736, 4.253403, 5.198604, 3.465736, 4.33217]],
    "bm25+": [[6.625572, 2.687639, 2.687639, 4.479399, 2.687639], [3.583519, 5.227335, 7.167038, 3.583519, 5.375278]],
  };

  for (const method of Object.keys(expected) as BM25Method[]) {
    it(`matches upstream scores for method=${method}`, () => {
      const retriever = new BM25({ method });
      retriever.index(tokenize(corpus, { stopwords: "en" }) as Tokenized);
      const q = tokenize(queries, { stopwords: "en" }) as Tokenized;
      const res = retriever.retrieve(q, { k: corpus.length }) as {
        documents: number[][];
        scores: Float64Array[];
      };
      for (let qi = 0; qi < queries.length; qi++) {
        const full = new Array(corpus.length).fill(0);
        res.documents[qi].forEach((d, i) => (full[d] = res.scores[qi][i]));
        full.forEach((s, d) => expect(s).toBeCloseTo(expected[method][qi][d], 5));
      }
    });
  }
});

describe("save/load progress options (upstream 0.3.6 / 0.3.10)", () => {
  const dir = "/tmp/bm25s-test-progress-options";
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("accepts showProgress/leaveProgress without changing results", async () => {
    const corpus = ["cats purr softly", "dogs bark loudly", "birds fly high"];
    const retriever = new BM25();
    retriever.index(tokenize(corpus) as Tokenized, { showProgress: false, leaveProgress: true });
    await retriever.save(dir, { corpus, showProgress: false, leaveProgress: false });
    const loaded = await BM25.load(dir, { loadCorpus: true, showProgress: false, leaveProgress: true });

    const q = tokenize(["dogs bark"]) as Tokenized;
    const a = retriever.retrieve(q, { k: 1 }) as any;
    const b = loaded.retrieve(q, { k: 1 }) as any;
    expect(b.documents[0][0]).toBe("dogs bark loudly");
    expect(b.scores[0][0]).toBeCloseTo(a.scores[0][0], 10);
  });
});
