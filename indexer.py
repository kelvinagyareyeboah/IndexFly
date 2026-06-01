import os
import re
import json
import math
from collections import defaultdict

STOP_WORDS = {"a", "an", "the", "is", "it", "in", "on", "at", "to", "of", "and", "or", "for", "with", "that", "this", "are", "was", "be", "by", "from"}

def tokenize(text):
    tokens = re.findall(r'\b[a-z]+\b', text.lower())
    return [t for t in tokens if t not in STOP_WORDS]

def build_index(docs_dir):
    inverted_index = defaultdict(dict)   # term -> {doc_id: term_freq}
    doc_lengths = {}                      # doc_id -> token count
    doc_names = {}                        # doc_id -> filename

    files = [f for f in os.listdir(docs_dir) if f.endswith(".txt")]
    for doc_id, filename in enumerate(sorted(files)):
        path = os.path.join(docs_dir, filename)
        with open(path, "r", encoding="utf-8") as f:
            tokens = tokenize(f.read())
        doc_names[doc_id] = filename
        doc_lengths[doc_id] = len(tokens)
        freq = defaultdict(int)
        for t in tokens:
            freq[t] += 1
        for term, tf in freq.items():
            inverted_index[term][doc_id] = tf

    N = len(files)
    avg_dl = sum(doc_lengths.values()) / N if N else 1

    index = {
        "inverted_index": {t: dict(postings) for t, postings in inverted_index.items()},
        "doc_lengths": {str(k): v for k, v in doc_lengths.items()},
        "doc_names": {str(k): v for k, v in doc_names.items()},
        "N": N,
        "avg_dl": avg_dl,
    }

    with open("index.json", "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2)

    print(f"Indexed {N} documents, {len(inverted_index)} unique terms -> index.json")

if __name__ == "__main__":
    build_index("sample_docs")
