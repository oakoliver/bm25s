# Regenerates bm25s-0.3.16-reference.json (run inside tests/fixtures):
#   python -m venv v && v/bin/pip install bm25s==0.3.16 numpy && v/bin/python generate-reference.py
import json, bm25s, bm25s.stopwords as sw, numpy as np  # noqa
out = {"version": bm25s.__version__}
langs = {n[10:].lower(): getattr(sw, n) for n in dir(sw) if n.startswith("STOPWORDS_")}
out["stopwords"] = {k: list(v) for k, v in langs.items()}
texts = ["a cat is a feline and likes to purr", "Café crème with a naïve señor in the straße",
         "나는 그리고 학교에 갔다", "It's 3.14 -- don't stop; e-mail me@x.org 日本語のテキスト", "x y zz"]
out["tokens"] = {}
for sp in [None, "en"]:
    r = bm25s.tokenize(texts, stopwords=sp if sp else [], return_ids=False, show_progress=False)
    out["tokens"][str(sp)] = r
corpus = ["a cat is a feline and likes to purr","a dog is the human's best friend and loves to play",
 "a bird is a beautiful animal that can fly","a fish is a creature that lives in water and swims",
 "Café crème with a naïve señor in the straße"]
queries = ["does the fish purr like a cat?", "café friend that can fly"]
out["scores"] = {}
for m in ["robertson","lucene","atire","bm25l","bm25+"]:
    ct = bm25s.tokenize(corpus, stopwords="en", show_progress=False)
    r = bm25s.BM25(method=m, backend="numpy"); r.index(ct, show_progress=False)
    qt = bm25s.tokenize(queries, stopwords="en", show_progress=False, return_ids=False)
    rows = []
    for q in qt:
        rows.append([float(x) for x in r.get_scores(q)])
    out["scores"][m] = rows
# negative k
r = bm25s.BM25(backend="numpy"); r.index(bm25s.tokenize(corpus, show_progress=False), show_progress=False)
try: r.retrieve(bm25s.tokenize(["cat"], show_progress=False), k=-1, show_progress=False); out["negk"]="no error"
except Exception as e: out["negk"]=type(e).__name__+": "+str(e)
json.dump(out, open("bm25s-0.3.16-reference.json","w"), ensure_ascii=False, indent=1)
print(sorted(langs), out["negk"])
