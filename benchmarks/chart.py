"""Render the README speedup chart from a saved `bun run benchmarks/compare.ts` log.

Usage: python3 benchmarks/chart.py benchmarks/results/<log>.txt
Writes assets/speedup-light.png and assets/speedup-dark.png.
"""

import re
import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker

THEMES = {
    "light": {"surface": "#fcfcfb", "text": "#0b0b0b", "muted": "#52514e", "grid": "#e4e3df",
              "numpy": "#2a78d6", "numba": "#eb6834"},
    "dark": {"surface": "#1a1a19", "text": "#ffffff", "muted": "#c3c2b7", "grid": "#383835",
             "numpy": "#3987e5", "numba": "#d95926"},
}


def parse(log):
    """Return {(section, backend): [(corpus_size, speedup), ...]} from the log tables."""
    series, key = {}, None
    for line in log.splitlines():
        header = re.match(r"(INDEXING|RETRIEVAL) PERFORMANCE: .*\((numpy|numba) backend\)", line)
        if header:
            key = (header[1].lower(), header[2])
            series[key] = []
            continue
        row = re.match(r"([\d,]+)\s{2,}.*?([\d.]+)x", line)
        if key and row:
            series[key].append((int(row[1].replace(",", "")), float(row[2])))
    return series


def machine(log):
    chip = re.search(r"Chip: (.+)", log)[1].strip()
    bun = re.search(r"Bun: (.+)", log)[1].strip()
    date = re.search(r"Date: (\d{4}-\d{2}-\d{2})", log)[1]
    return f"{chip} · Bun {bun} · {date}"


def render(series, subtitle, mode):
    t = THEMES[mode]
    plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 11})
    fig, axes = plt.subplots(1, 2, figsize=(10, 4.4), sharey=True, facecolor=t["surface"])
    for ax, section in zip(axes, ["indexing", "retrieval"]):
        ax.set_facecolor(t["surface"])
        ax.axhline(1, color=t["muted"], linewidth=1, linestyle=(0, (4, 3)))
        ends = {b: series[(section, b)][-1][1] for b in ("numpy", "numba")}
        for backend, label in [("numpy", "vs numpy backend"), ("numba", "vs numba backend")]:
            points = series[(section, backend)]
            xs = list(range(len(points)))
            ys = [s for _, s in points]
            ax.plot(xs, ys, color=t[backend], linewidth=2, marker="o", markersize=7,
                    markeredgecolor=t["surface"], markeredgewidth=2, label=label, zorder=3)
            # Nudge the two end labels apart when the series finish close together.
            other = ends["numba" if backend == "numpy" else "numpy"]
            dy = 0 if abs(ys[-1] / other - 1) > 0.25 else (5 if ys[-1] >= other else -9)
            ax.annotate(f"{ys[-1]:.2f}×", (xs[-1], ys[-1]), textcoords="offset points", xytext=(8, dy - 4),
                        color=t["text"], fontsize=10)
        ax.set_yscale("log")
        ax.set_yticks([0.02, 0.1, 0.5, 1, 2, 4])
        ax.set_yticklabels(["0.02×", "0.1×", "0.5×", "1× same", "2×", "4×"])
        ax.yaxis.set_minor_locator(matplotlib.ticker.NullLocator())
        ax.set_ylim(0.015, 5)
        ax.set_xticks(xs)
        ax.set_xticklabels([f"{n // 1000}K" for n, _ in points])
        ax.set_xlim(-0.3, len(xs) - 0.4)
        ax.set_xlabel("documents in corpus", color=t["muted"])
        ax.set_title("Indexing" if section == "indexing" else "Retrieval (1,000 queries, k=10)",
                     color=t["text"], loc="left", fontsize=12, fontweight="bold")
        ax.grid(axis="y", color=t["grid"], linewidth=0.8)
        ax.tick_params(colors=t["muted"], length=0)
        for spine in ax.spines.values():
            spine.set_visible(False)
    axes[0].set_ylabel("speed relative to Python bm25s", color=t["muted"])
    legend = axes[0].legend(loc="lower right", frameon=False, labelcolor=t["text"])
    fig.suptitle("bm25s (TypeScript) vs Python bm25s — above 1× is faster", x=0.01, y=0.97, ha="left",
                 color=t["text"], fontsize=14, fontweight="bold")
    fig.text(0.01, 0.885, subtitle, color=t["muted"], fontsize=10)
    fig.tight_layout(rect=(0, 0, 1, 0.9))
    fig.savefig(f"assets/speedup-{mode}.png", dpi=160, facecolor=t["surface"])


if __name__ == "__main__":
    log = open(sys.argv[1]).read()
    series = parse(log)
    for mode in THEMES:
        render(series, machine(log), mode)
