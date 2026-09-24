import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    ROLE_CHOICES = [
        ('ADMIN', 'Admin'),
        ('OFFICER', 'Police Officer'),
        ('INVESTIGATOR', 'Investigator'),
        ('LEGAL_OFFICER', 'Legal Officer'),
        ('JUDGE', 'Judge'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, blank=False, null=False)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='OFFICER')
    public_key = models.TextField(blank=True, null=True)
    encrypted_private_key = models.TextField(blank=True, null=True)
    webauthn_credential_id = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Resolve reverse relation conflicts
    groups = models.ManyToManyField(
        'auth.Group',
        related_name='accounts_user_groups',
        blank=True,
        help_text='The groups this user belongs to. A user will get all permissions granted to each of their groups.',
        verbose_name='groups',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='accounts_user_permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        verbose_name='user permissions',
    )

    def set_password(self, raw_password):
        self._raw_password = raw_password
        super().set_password(raw_password)

    def save(self, *args, **kwargs):
        if not self.public_key or not self.encrypted_private_key:
            try:
                from .crypto import generate_rsa_keypair, encrypt_private_key
                public_pem, private_pem = generate_rsa_keypair()
                enc_secret = getattr(self, '_raw_password', None) or self.username or "sdms_secure_key_2026"
                if not self.public_key:
                    self.public_key = public_pem
                if not self.encrypted_private_key:
                    self.encrypted_private_key = encrypt_private_key(private_pem, enc_secret)
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Could not auto-generate RSA keypair for {self.username}: {e}")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.username} ({self.role})"
