import os
import base64
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

def generate_rsa_keypair():
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048
    )
    public_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode('utf-8')
    
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    return public_pem, private_pem

def derive_key(password: str, salt: bytes) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000
    )
    return kdf.derive(password.encode())

def encrypt_private_key(private_pem: bytes, password: str) -> str:
    salt = os.urandom(16)
    iv = os.urandom(12)
    key = derive_key(password, salt)
    
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(iv, private_pem, None)
    
    payload = salt + iv + ciphertext
    return base64.b64encode(payload).decode('utf-8')

def decrypt_private_key(encrypted_payload_b64: str, password: str) -> bytes:
    try:
        payload = base64.b64decode(encrypted_payload_b64.encode('utf-8'))
        salt = payload[:16]
        iv = payload[16:28]
        ciphertext = payload[28:]
        
        key = derive_key(password, salt)
        aesgcm = AESGCM(key)
        private_pem = aesgcm.decrypt(iv, ciphertext, None)
        return private_pem
    except Exception as e:
        raise ValueError(f"Failed to decrypt private key: {str(e)}")
