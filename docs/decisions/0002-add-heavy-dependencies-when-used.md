# 0002: Add Docling and the LLM SDK when their code is written

**Date:** 2026-11-04

## Decision

The skeleton includes only the dependencies it already uses: FastAPI and Pydantic in the pipeline, and Next.js, Drizzle and Zod in the web app. Docling and the Claude or GPT SDK are added in the same change that builds `intake/eob_pdf.py` and `draft/llm_client.py`.

## Why

Docling pulls in large ML packages that slow `uv sync` and CI for every task, including ones that never read a PDF. Adding a dependency alongside the code that needs it also keeps the reason for it in the same pull request, as AGENTS.md asks.
