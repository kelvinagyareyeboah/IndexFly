import json
import math
import re

K1 = 1.5
B = 0.75

def load_index(path="index.json"):
    with open(path, "r", encoding="utf-8") as f:
        raw = json.load(f)
    raw["doc_lengths"] = {int(k): v for k, v in raw["doc_lengths"].items()}
    raw["doc_names"] = {int(k): v for k, v in raw["doc_names"].items()}
    return raw

def bm25_score(term, doc_id, index):
    postings = index["inverted_index"].get(term, {})
    tf = postings.get(str(doc_id), 0)
    if tf == 0:
        return 0.0
    N = index["N"]
    df = len(postings)
    dl = index["doc_lengths"][doc_id]
    avg_dl = index["avg_dl"]
    idf = math.log((N - df + 0.5) / (df + 0.5) + 1)
    tf_norm = (tf * (K1 + 1)) / (tf + K1 * (1 - B + B * dl / avg_dl))
    return idf * tf_norm

def docs_containing(term, index):
    return set(int(k) for k in index["inverted_index"].get(term, {}).keys())

def all_docs(index):
    return set(index["doc_lengths"].keys())

def parse_and_execute(query_str, index):
    """
    Supports: term AND term, term OR term, term AND NOT term
    Falls back to ranked BM25 for plain queries.
    """
    query_str = query_str.strip()

    # Boolean detection
    if re.search(r'\bAND NOT\b|\bAND\b|\bOR\b', query_str):
        return boolean_search(query_str, index)

    # Plain BM25 ranked search
    terms = re.findall(r'\b[a-z]+\b', query_str.lower())
    scores = {}
    for doc_id in all_docs(index):
        score = sum(bm25_score(t, doc_id, index) for t in terms)
        if score > 0:
            scores[doc_id] = score
    return sorted(scores.items(), key=lambda x: x[1], reverse=True)

def boolean_search(query_str, index):
    # Split on AND NOT first, then AND, then OR
    if "AND NOT" in query_str:
        left, right = query_str.split("AND NOT", 1)
        result = docs_containing(left.strip().lower(), index) - docs_containing(right.strip().lower(), index)
    elif "AND" in query_str:
        parts = query_str.split("AND")
        result = all_docs(index)
        for p in parts:
            result &= docs_containing(p.strip().lower(), index)
    elif "OR" in query_str:
        parts = query_str.split("OR")
        result = set()
        for p in parts:
            result |= docs_containing(p.strip().lower(), index)
    else:
        result = all_docs(index)

    # Return as scored list (boolean results get score 1.0)
    return [(doc_id, 1.0) for doc_id in sorted(result)]
