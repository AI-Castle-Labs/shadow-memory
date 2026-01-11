#!/usr/bin/env python3
import chromadb
import sys
from pathlib import Path

CHROMA_DIR = Path(__file__).parent.parent / ".chroma-data"


def query(query_text: str, n_results: int = 5) -> None:
    client = chromadb.PersistentClient(path=str(CHROMA_DIR))

    try:
        collection = client.get_collection("bug-fix-skills")
    except Exception:
        print("Error: Collection 'bug-fix-skills' not found.")
        print("Run 'python scripts/index-skills.py' first to index the documents.")
        sys.exit(1)

    results = collection.query(query_texts=[query_text], n_results=n_results)

    if not results["documents"] or not results["documents"][0]:
        print("No results found.")
        return

    print(f"Query: {query_text}\n")
    print("=" * 60)

    for i, (doc, meta, distance) in enumerate(
        zip(
            results["documents"][0],
            results["metadatas"][0],  # type: ignore
            results["distances"][0]
            if results["distances"]
            else [0] * len(results["documents"][0]),  # type: ignore
        )
    ):
        relevance = 1 - (distance / 2) if distance else 1.0
        print(f"\n[{i + 1}] {meta['source']} > {meta['header']}")
        print(f"    Relevance: {relevance:.0%}")
        print("-" * 60)

        lines = doc.split("\n")
        preview = "\n".join(lines[:15])
        if len(lines) > 15:
            preview += f"\n... ({len(lines) - 15} more lines)"
        print(preview)
        print()


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python query-skills.py <query>")
        print("Example: python query-skills.py 'module not found import error'")
        sys.exit(1)

    query_text = " ".join(sys.argv[1:])
    n_results = 5

    query(query_text, n_results)


if __name__ == "__main__":
    main()
