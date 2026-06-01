import os
import sys
from indexer import build_index
from query import load_index, parse_and_execute

DOCS_DIR = "sample_docs"
INDEX_FILE = "index.json"

def main():
    if not os.path.exists(INDEX_FILE):
        print("No index found. Building index...")
        build_index(DOCS_DIR)

    index = load_index(INDEX_FILE)
    doc_names = index["doc_names"]

    print("\n=== Search Engine ===")
    print("Supports: plain terms, AND, OR, AND NOT")
    print("Examples:  python data   |   machine AND learning   |   database AND NOT SQL")
    print("Type 'reindex' to rebuild index, 'quit' to exit.\n")

    while True:
        try:
            query = input("Search> ").strip()
        except (EOFError, KeyboardInterrupt):
            break

        if not query:
            continue
        if query.lower() == "quit":
            break
        if query.lower() == "reindex":
            build_index(DOCS_DIR)
            index = load_index(INDEX_FILE)
            doc_names = index["doc_names"]
            continue

        results = parse_and_execute(query, index)

        if not results:
            print("  No results found.\n")
        else:
            print(f"  {len(results)} result(s):")
            for rank, (doc_id, score) in enumerate(results, 1):
                name = doc_names[doc_id]
                path = os.path.join(DOCS_DIR, name)
                with open(path, "r", encoding="utf-8") as f:
                    snippet = f.readline().strip()
                print(f"  {rank}. [{score:.3f}] {name} — {snippet}")
            print()

if __name__ == "__main__":
    main()
