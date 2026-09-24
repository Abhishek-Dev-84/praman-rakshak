import base64
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import serialization

def sign_data(private_key_pem: bytes, data_to_sign: bytes) -> str:
    private_key = serialization.load_pem_private_key(
        private_key_pem,
        password=None
    )
    signature = private_key.sign(
        data_to_sign,
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=padding.PSS.MAX_LENGTH
        ),
        hashes.SHA256()
    )
    return base64.b64encode(signature).decode('utf-8')

def verify_signature(public_key_pem: str, data: bytes, signature_b64: str) -> bool:
    try:
        public_key = serialization.load_pem_public_key(
            public_key_pem.encode('utf-8')
        )
        signature = base64.b64decode(signature_b64.encode('utf-8'))
        public_key.verify(
            signature,
            data,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
        return True
    except Exception:
        return False
