# RAG source documents

Put the patient medical report **PDFs** here (and any sensor **CSV** exports).

- At least one PDF is required, or `/chat/query` returns 503.
- Indexes are built on first request and cached in `backend/rag_index/`.
- Delete `backend/rag_index/` after changing these files to force a rebuild.

The contents of this folder are gitignored — medical documents must not be committed.
