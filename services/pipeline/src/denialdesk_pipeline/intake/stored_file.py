"""Read an uploaded file back from encrypted storage.

The web app writes each upload as: 12-byte nonce, then AES-256-GCM ciphertext
with its 16-byte tag at the end. See docs/decisions/0006-encrypted-file-storage.md.
"""

import base64
from pathlib import Path

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

LOCAL_STORAGE_PREFIX = "local:"
NONCE_LENGTH = 12
ENCRYPTION_KEY_LENGTH = 32


class StoredFileError(ValueError):
    """The storage URI or key is wrong. Messages never include file contents."""


def decode_encryption_key(key_base64: str) -> bytes:
    key = base64.b64decode(key_base64)
    if len(key) != ENCRYPTION_KEY_LENGTH:
        raise StoredFileError("FILE_ENCRYPTION_KEY must be 32 bytes, base64 encoded")
    return key


def local_storage_path(storage_dir: Path, storage_uri: str) -> Path:
    if not storage_uri.startswith(LOCAL_STORAGE_PREFIX):
        raise StoredFileError("Only local storage is supported so far")
    stored_name = storage_uri.removeprefix(LOCAL_STORAGE_PREFIX)
    # Names are random ids made by the web app. Anything path-like is a bug or an attack.
    if stored_name == "" or "/" in stored_name or "\\" in stored_name or ".." in stored_name:
        raise StoredFileError("Storage name is not a plain file name")
    return storage_dir / stored_name


def decrypt_file_bytes(encrypted_bytes: bytes, encryption_key: bytes) -> bytes:
    nonce = encrypted_bytes[:NONCE_LENGTH]
    ciphertext_with_tag = encrypted_bytes[NONCE_LENGTH:]
    return AESGCM(encryption_key).decrypt(nonce, ciphertext_with_tag, None)


def read_stored_file(storage_dir: Path, storage_uri: str, encryption_key: bytes) -> bytes:
    file_path = local_storage_path(storage_dir, storage_uri)
    encrypted_bytes = file_path.read_bytes()
    return decrypt_file_bytes(encrypted_bytes, encryption_key)
