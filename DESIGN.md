# IndexFly — Design Document

## Problem Statement

Build a custom full-text search engine and web crawler that can index a corpus
of documents and serve ranked results for free-text and boolean queries with
sub-millisecond latency.

---

## Data Structure: Inverted Index

### Why not a naive approach?

A naive approach scans every document for every query — O(N × D) where N is the
number of query terms and D is the total number of tokens across all documents.
At 1M documents averaging 500 tokens each, that's 500M comparisons per query.
Unacceptable.

### The inverted index

An inverted index flips the relationship: instead of document → words, we store
word → documents. At query time we look up each term in O(1) and intersect the
posting lists.

```
"python"  → { doc3: 4, doc7: 2, doc12: 1 }
"data"    → { doc3: 2, doc5: 6, doc7: 1  }
```

**Query time complexity:** O(k × P) where k is the number of query terms and P
is the average posting list length — typically much smaller than D.

**Index build complexity:** O(T) where T is the total number of tokens in the
corpus. One pass through all documents.

**Space complexity:** O(T) — each token occurrence is stored once.

---

## Ranking: BM25

### Why not TF-IDF?

TF-IDF has two known failure modes:
1. **Long document bias** — a document with 10,000 words that mentions "python"
   once scores higher than a 100-word document about Python, purely due to raw
   term frequency.
2. **Term frequency saturation** — the 100th occurrence of a term should not
   contribute as much as the 1st, but TF-IDF treats them linearly.

### BM25 formula

```
score(D, Q) = Σ IDF(qᵢ) × (tf(qᵢ,D) × (k1 + 1)) / (tf(qᵢ,D) + k1 × (1 - b + b × |D|/avgdl))
```

- **k1 = 1.5** — controls term frequency saturation. Higher = more weight to
  repeated terms. Range [1.2, 2.0] is standard.
- **b = 0.75** — controls document length normalization. 1.0 = full
  normalization, 0.0 = no normalization.
- **IDF** — inverse document frequency penalizes terms that appear in many
  documents (common words like "the" get near-zero weight even without a stop
  word list).

BM25 fixes both TF-IDF failure modes: the denominator saturates tf, and the
`|D|/avgdl` term normalizes for document length.

---

## Boolean Query Parsing

Supported operators: `AND`, `OR`, `AND NOT`

Parsing strategy: single-pass string detection, no AST needed at this scale.
Operator precedence: `AND NOT` > `AND` > `OR` (matched in that order).

```
"machine AND learning"     → intersect(docs("machine"), docs("learning"))
"database OR python"       → union(docs("database"), docs("python"))
"database AND NOT SQL"     → subtract(docs("database"), docs("SQL"))
```

Set operations on posting lists run in O(P) where P is posting list length.

**Limitation:** No parenthesized expressions. At scale this would be replaced
with a proper recursive descent parser building an expression tree.

---

## Autocomplete

Current implementation: prefix scan over all terms in the inverted index,
ranked by document frequency (df). Terms appearing in more documents rank
higher — they are more likely to be what the user wants.

**Complexity:** O(V) where V is vocabulary size. Acceptable for tens of
thousands of terms.

**At scale:** Replace with a trie or a sorted term list with binary search for
O(L + K) where L is prefix length and K is the number of matches. For
production, a dedicated prefix index or Elasticsearch's `completion` suggester
would be used.

---

## API Design

| Endpoint | Method | Params | Description |
|---|---|---|---|
| `/api/search` | GET | `q`, `page`, `limit` | Ranked or boolean search with pagination |
| `/api/autocomplete` | GET | `q` | Prefix-based term suggestions |
| `/api/stats` | GET | — | Index metadata |
| `/api/reindex` | GET | — | Rebuild index from sample_docs/ |

Pagination is server-side: the full result set is computed, then sliced.
At scale, early termination (WAND algorithm) would avoid scoring all documents.

---

## Tradeoffs Made

| Decision | Chosen | Alternative | Reason |
|---|---|---|---|
| Index persistence | JSON file | SQLite / embedded DB | Zero dependencies, sufficient for this scale |
| Autocomplete | Prefix scan | Trie | Simpler, fast enough under 100K terms |
| Query parsing | String matching | Recursive descent parser | No nested expressions needed |
| Ranking | BM25 | Neural/semantic ranking | Interpretable, no ML infra needed |
| Concurrency | Single index pointer | RWMutex on reindex | Reindex is infrequent, simplicity wins |

---

## What Would Change at 1M Documents

1. **Index storage** → memory-mapped files or RocksDB for posting lists that
   don't fit in RAM
2. **Query execution** → WAND (Weak AND) algorithm for early termination,
   reducing scoring from O(N) to O(K) where K is the result set size
3. **Autocomplete** → Trie with compressed nodes (radix tree), or FST
   (Finite State Transducer) as used by Lucene
4. **Reindexing** → Incremental updates with a write-ahead log, not full
   rebuilds
5. **Ranking** → Two-phase: BM25 for candidate retrieval, then a learning-to-rank
   model (LambdaMART) for final reranking
6. **Concurrency** → Segment-based index (like Lucene) where each segment is
   immutable, enabling lock-free reads during merges

---

## Performance Characteristics (Current)

| Operation | Complexity | Measured (15 docs) |
|---|---|---|
| Index build | O(T) | < 5ms |
| BM25 query | O(k × P) | < 1ms |
| Boolean query | O(P) | < 1ms |
| Autocomplete | O(V) | < 1ms |

T = total tokens, k = query terms, P = avg posting list length, V = vocabulary size
