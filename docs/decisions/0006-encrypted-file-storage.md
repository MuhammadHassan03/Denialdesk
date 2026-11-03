# 0006: Uploads are encrypted with AES-256-GCM before they touch disk

**Date:** 2026-11-04

## Decision

The upload action encrypts each file with AES-256-GCM using `FILE_ENCRYPTION_KEY` (32 bytes, base64) and writes it to `STORAGE_DIR` under a random name. The stored URI is `local:<name>`. The layout is a 12-byte nonce, the ciphertext, then the 16-byte tag. The pipeline reads it back in `intake/stored_file.py`.

## Why

Uploads are 835s and EOBs, which hold PHI, and AGENTS.md lists encrypted storage in scope. Node has AES-GCM built in. Python needs the `cryptography` package for it, because the standard library has no AES.

## Later

An encrypted bucket replaces local disk with a new URI prefix. Key rotation needs a key id in the file header. Neither is needed while we run on synthetic data.
