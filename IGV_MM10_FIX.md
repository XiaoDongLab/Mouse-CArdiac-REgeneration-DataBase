# Fix: "Unknown genome id: mm10" in the genome browser

## Symptom
Opening the genome browser shows an alert: `Unknown genome id: mm10`.

## Cause
`genome: "mm10"` is a *string id*. IGV resolves string ids against a remote
genome registry fetched at startup (`src/js/igv.esm.js`, `GenomeUtils.initializeGenomes`):
- Primary: `https://igv.org/genomes/genomes.json` — returns JSON, but sends **no
  `Access-Control-Allow-Origin` header**, so the browser blocks the cross-origin
  fetch from `localhost`. (curl "works" because curl ignores CORS — easy to miss.)
- Backup: `raw.githubusercontent.com/.../packages/igv/src/genomes/genomes.json` — now **404**.

Both fail -> registry empty -> `expandReference` throws "Unknown genome id: mm10"
(`igv.esm.js:30950`). Note: only the registry *index* was broken; the mm10 *data*
files (fasta/index/cytoband) are CORS-fine.

## Fix
Define the genome **inline** as a `reference` object so IGV skips the registry
entirely. A non-string `reference` is used directly (`igv.esm.js:77717`,
`session.reference || session.genome`).

File: `src/app/components/igv/igv.component.ts`

```ts
static readonly MM10_REFERENCE = {
  id: 'mm10',
  name: 'Mouse (GRCm38/mm10)',
  fastaURL: 'https://igv.org/genomes/data/mm10/mm10.fa',
  indexURL: 'https://igv.org/genomes/data/mm10/mm10.fa.fai',
  cytobandURL: 'https://hgdownload.soe.ucsc.edu/goldenPath/mm10/database/cytoBand.txt.gz',
};
```

Then replace both `genome: "mm10"` occurrences (the default `options` and the
`ngAfterViewInit` rebuild) with `reference: IgvComponent.MM10_REFERENCE`.

All three data URLs verified: HTTP 206 + `Access-Control-Allow-Origin: *` with
range requests.

## Follow-up: missing RefSeq gene-bodies track
Switching to the inline `reference` dropped the gene annotation track. IGV builds
its track list as genome tracks + session tracks (`igv.esm.js:77775`), and the old
registry's mm10 entry supplied a RefSeq track via `genomeConfig.tracks`. The inline
`reference` had none, so gene bodies disappeared (the ENCODE session tracks stayed).

Fix: add a `tracks` array to `MM10_REFERENCE`:

```ts
tracks: [
  {
    name: 'RefSeq Curated',
    format: 'refgene',
    url: 'https://hgdownload.soe.ucsc.edu/goldenPath/mm10/database/ncbiRefSeqCurated.txt.gz',
    indexed: false,
    color: 'rgb(12,12,120)',
    order: 1000000,
    removable: false,
  },
]
```

URL verified CORS-OK (HTTP 206, `Access-Control-Allow-Origin: *`). Note the registry
default was "RefSeq All" (`ncbiRefSeq.txt.gz`); we use the curated subset instead.

## Why this won't recur
The previous breakage happened because the fix depended on an external registry
the IGV team keeps moving/de-CORSing. The inline `reference` removes that
dependency, so it survives future igv.org hosting changes. If it ever breaks
again, it will be because one of the three data URLs above moved — check them
directly in the browser console.
