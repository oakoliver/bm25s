"""Optional cross-check for examples/multilingual.ts: score the same corpus with Python bm25s.

Usage: python py_scores.py multilingual-corpus.json   (needs `pip install bm25s==0.3.11`)
Prints JSON: bm25s version, stopword count, and for every query its tokens and the
score of every document. The TypeScript demo runs this itself when Python bm25s is available.
"""
import json
import sys

import bm25s
import bm25s.stopwords as S

data = json.load(open(sys.argv[1], encoding="utf-8"))
corpus = [d["text"] for d in data["docs"]]
queries = [q["text"] for q in data["queries"]]

# Union of every stopword list upstream ships, same as the TypeScript side
sw = sorted({w for n in dir(S) if n.startswith("STOPWORDS") for w in getattr(S, n)})

retriever = bm25s.BM25()  # method="lucene", k1=1.5, b=0.75
retriever.index(bm25s.tokenize(corpus, stopwords=sw, show_progress=False), show_progress=False)

out = []
for tokens in bm25s.tokenize(queries, stopwords=sw, return_ids=False, show_progress=False):
    known = [t for t in tokens if t in retriever.vocab_dict]
    scores = retriever.get_scores(known) if known else [0.0] * len(corpus)
    out.append({"tokens": tokens, "scores": [float(x) for x in scores]})

json.dump({"version": bm25s.__version__, "stopwords": len(sw), "queries": out}, sys.stdout)
