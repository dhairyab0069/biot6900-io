"""Export the data behind the interactive charts from the main biot6900 repository.

Run:  python scripts/build_data.py [path/to/biot6900]   (default ~/BIOT6900)
Needs the main repo's local data folders (module2/data, module4/structures, module5/data,
module6/data), which are created by running each module's notebook. Writes assets/data/*.json
and assets/structures/*.pdb. Only gene-level or group-level numbers are written.
"""
import json
import shutil
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else Path.home() / "BIOT6900")
OUT = Path(__file__).resolve().parents[1] / "assets"
(OUT / "data").mkdir(parents=True, exist_ok=True)
(OUT / "structures").mkdir(parents=True, exist_ok=True)


def dump(name, obj):
    (OUT / "data" / name).write_text(json.dumps(obj, separators=(",", ":")))
    print("wrote", name)


# ---- Module 2: the 1,115 integrated genes and the Venn regions ----
full = pd.read_csv(SRC / "module2/targets_ad_full.csv")
dump("m2_genes.json", [[g, round(r, 3), round(p, 3), round(n, 1), int(k), bool(c)]
                       for g, r, p, n, k, c in full[["gene", "rna_lfc", "prot_lfc", "neglog10p", "rank", "concordant"]].itertuples(index=False)])

rna = pd.read_csv(SRC / "module2/data/ad_transcriptomics.tsv", sep="\t")
prot = pd.read_csv(SRC / "module2/data/ad_proteomics.tsv", sep="\t")
gwas = pd.read_csv(SRC / "module2/data/ad_gwas.tsv", sep="\t")


def regions(a, b, c):
    return {"a": len(a - b - c), "b": len(b - a - c), "c": len(c - a - b), "ab": len(a & b - c),
            "ac": len(a & c - b), "bc": len(b & c - a), "abc": len(a & b & c),
            "na": len(a), "nb": len(b), "nc": len(c)}


dump("m2_venn.json", {
    "measured": regions(set(rna.gene), set(prot.gene), set(gwas.gene)),
    "significant": regions(set(rna.gene[rna.pval < 0.05]), set(prot.gene[prot.pval < 0.05]),
                           set(gwas.gene[gwas.neglog10p >= -np.log10(5e-8)]))})

# ---- Module 4: structures, per-residue pLDDT and the pockets shown in the report ----
POCKETS = {"P20702": {4: "pocket 4 (score 0.49)", 79: "pocket 79 (score 0.47)"},
           "P35414": {2: "pocket 2: real drug site (8EH)", 9: "pocket 9: top fpocket score (0.30)"}}
m4 = {}
for uni, wanted in POCKETS.items():
    s = SRC / "module4/structures"
    shutil.copy(s / f"AF-{uni}.pdb", OUT / "structures" / f"AF-{uni}.pdb")
    plddt = [round(float(l[60:66]), 1) for l in open(s / f"AF-{uni}.pdb")
             if l.startswith("ATOM") and l[12:16].strip() == "CA"]
    pk = {i: [] for i in wanted}
    for l in open(s / f"AF-{uni}_out" / f"AF-{uni}_out.pdb"):
        if l.startswith("HETATM") and l[17:20] == "STP" and int(l[22:26]) in pk:
            pk[int(l[22:26])].append([round(float(l[30:38]), 2), round(float(l[38:46]), 2), round(float(l[46:54]), 2)])
    m4[uni] = {"plddt": plddt, "pockets": [{"id": i, "label": wanted[i], "xyz": pk[i]} for i in wanted]}
dump("m4_structures.json", m4)

# ---- Module 5: the points in the CADD calibration figure ----
NO_FUNCTION = {"rs4244285": "*2", "rs4986893": "*3", "rs28399504": "*4", "rs56337013": "*5",
               "rs72552267": "*6", "rs41291556": "*8"}


def clinvar_label(sig):
    if not isinstance(sig, str): return "none"
    s = sig.lower()
    if "conflict" in s: return "conflicting"
    if "pathogenic" in s and "non-pathogenic" not in s: return "P/LP"
    if "benign" in s: return "B/LB"
    if "uncertain" in s: return "VUS"
    return "other"


def load(gene):
    d = pd.read_csv(SRC / f"module5/data/{gene}.tsv", sep="\t")
    for c in ("cadd_phred", "gnomad_af"):
        d[c] = pd.to_numeric(d[c], errors="coerce")
    d["label"] = d.clinvar_sig.map(clinvar_label)
    return d[d.gnomad_af.isna() | (d.gnomad_af <= 0.5)].assign(source=gene)


G, D = load("CYP2C19"), load("DPYD")
pool = pd.concat([G, D], ignore_index=True)
lab = pool[pool.label.isin(["P/LP", "B/LB"]) & pool.cadd_phred.notna()]
vus = G[(G.label == "VUS") & G.cadd_phred.notna()]
nf = (G[G.rsid.isin(NO_FUNCTION) & G.cadd_phred.notna()].sort_values("cadd_phred").drop_duplicates("rsid", keep="last"))
pt = lambda r, grp: {"g": grp, "gene": r.gene, "rsid": r.rsid if isinstance(r.rsid, str) else "",
                     "aa": r.aa_change if isinstance(r.aa_change, str) else "", "cons": r.consequence if isinstance(r.consequence, str) else "",
                     "cadd": round(float(r.cadd_phred), 1)}
pts = ([pt(r, "benign") for r in lab[lab.label == "B/LB"].itertuples()] +
       [pt(r, "pathogenic") for r in lab[lab.label == "P/LP"].itertuples()] +
       [pt(r, "vus") for r in vus.itertuples()] +
       [dict(pt(r, "star"), star=NO_FUNCTION[r.rsid]) for r in nf.itertuples()])
dump("m5_variants.json", pts)

# ---- Module 6: PRS histograms and calibration by ancestry (group-level only) ----
d6 = SRC / "module6/data"
geno, meta = pd.read_csv(d6 / "genotypes.csv"), pd.read_csv(d6 / "meta.csv")
score, vt = pd.read_csv(d6 / "score.csv"), pd.read_csv(d6 / "variants.csv").set_index("variant")
snps = list(score.variant)
Gm = geno[snps].to_numpy(float)
flip = score.effect_allele.to_numpy() == vt.loc[snps, "ref"].to_numpy()
Gm[:, flip] = 2 - Gm[:, flip]
prs = Gm @ score.weight.to_numpy()
z = (prs - prs.mean()) / prs.std()
y = meta.phenotype.to_numpy()
eur = (meta.ancestry == "EUR").to_numpy()
p_hat = LogisticRegression().fit(z[eur].reshape(-1, 1), y[eur]).predict_proba(z.reshape(-1, 1))[:, 1]
edges = np.round(np.arange(-2.6, 4.41, 0.2), 2)
cut = float(np.quantile(z, 0.9))
m6 = {"edges": edges.tolist(), "cutoff": round(cut, 3), "groups": {}}
for pop in ["EUR", "SAS", "EAS", "AMR", "AFR"]:
    m = (meta.ancestry == pop).to_numpy()
    h, _ = np.histogram(z[m], bins=edges)
    q = np.quantile(p_hat[m], np.linspace(0, 1, 6)); q[-1] += 1e-9
    idx = np.clip(np.digitize(p_hat[m], q) - 1, 0, 4)
    cal = [[round(float(p_hat[m][idx == b].mean()), 3), round(float(y[m][idx == b].mean()), 3), int((idx == b).sum())]
           for b in range(5) if (idx == b).sum() > 5]
    m6["groups"][pop] = {"n": int(m.sum()), "hist": h.tolist(), "cal": cal,
                         "mean": round(float(z[m].mean()), 2), "above": round(float((z[m] > cut).mean() * 100), 1)}
dump("m6_prs.json", m6)
