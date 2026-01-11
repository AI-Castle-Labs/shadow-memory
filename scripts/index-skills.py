#!/usr/bin/env python3
import chromadb
import os
import re
from pathlib import Path
from typing import Any

SKILLS_DIR = Path(__file__).parent.parent / ".claude" / "skills" / "bug-fix"
CHROMA_DIR = Path(__file__).parent.parent / ".chroma-data"


def chunk_markdown(content: str, filename: str) -> list[dict[str, str]]:
    chunks: list[dict[str, str]] = []
    lines = content.split("\n")
    current_chunk: list[str] = []
    current_header = filename
    header_stack: list[tuple[int, str]] = []

    for line in lines:
        header_match = re.match(r"^(#{1,4})\s+(.+)$", line)

        if header_match:
            if current_chunk:
                chunk_text = "\n".join(current_chunk).strip()
                if chunk_text and len(chunk_text) > 50:
                    chunks.append(
                        {
                            "text": chunk_text,
                            "header": current_header,
                            "source": filename,
                        }
                    )

            level = len(header_match.group(1))
            header_text = header_match.group(2)

            while header_stack and header_stack[-1][0] >= level:
                header_stack.pop()
            header_stack.append((level, header_text))

            current_header = " > ".join([h[1] for h in header_stack])
            current_chunk = [line]
        else:
            current_chunk.append(line)

    if current_chunk:
        chunk_text = "\n".join(current_chunk).strip()
        if chunk_text and len(chunk_text) > 50:
            chunks.append(
                {"text": chunk_text, "header": current_header, "source": filename}
            )

    return chunks


def main() -> None:
    CHROMA_DIR.mkdir(parents=True, exist_ok=True)

    client = chromadb.PersistentClient(path=str(CHROMA_DIR))

    try:
        client.delete_collection("bug-fix-skills")
        print("Deleted existing collection")
    except Exception:
        pass

    collection = client.create_collection(
        name="bug-fix-skills",
        metadata={"description": "Bug fix skill documents for RAG"},
    )

    all_chunks: list[dict[str, str]] = []

    for md_file in SKILLS_DIR.glob("*.md"):
        print(f"Processing: {md_file.name}")
        content = md_file.read_text()
        chunks = chunk_markdown(content, md_file.name)
        all_chunks.extend(chunks)
        print(f"  -> {len(chunks)} chunks")

    if not all_chunks:
        print("No chunks found!")
        return

    documents = [c["text"] for c in all_chunks]
    metadatas: list[dict[str, Any]] = [
        {"header": c["header"], "source": c["source"]} for c in all_chunks
    ]
    ids = [f"chunk_{i}" for i in range(len(all_chunks))]

    collection.add(
        documents=documents,
        metadatas=metadatas,  # type: ignore
        ids=ids,
    )

    print(f"\nIndexed {len(all_chunks)} chunks into 'bug-fix-skills' collection")

    print("\n--- Test Query: 'import error module not found' ---")
    results = collection.query(
        query_texts=["import error module not found"], n_results=3
    )

    if results["documents"] and results["metadatas"]:
        for i, (doc, meta) in enumerate(
            zip(results["documents"][0], results["metadatas"][0])
        ):
            print(f"\n[{i + 1}] {meta['source']} > {meta['header']}")
            print(f"    {doc[:150]}...")


if __name__ == "__main__":
    main()
