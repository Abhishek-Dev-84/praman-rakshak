from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from accounts.crypto import decrypt_private_key

User = get_user_model()

class AccountsTestCase(APITestCase):
    def test_user_registration_generates_keys(self):
        url = reverse('auth_register')
        data = {
            "username": "test_officer",
            "email": "officer@test.gov.in",
            "password": "securepassword123",
            "role": "OFFICER"
        }
        res = self.client.post(url, data)
        self.assertEqual(res.statusCode if hasattr(res, 'statusCode') else res.status_code, status.HTTP_201_CREATED)
        self.assertIn("public_key", res.json())
        
        # Verify database fields
        user = User.objects.get(username="test_officer")
        self.assertIsNotNone(user.public_key)
        self.assertIsNotNone(user.encrypted_private_key)
        self.assertNotEqual(user.encrypted_private_key, "securepassword123")
        
        # Verify private key is decryptable using password
        decrypted = decrypt_private_key(user.encrypted_private_key, "securepassword123")
        self.assertIn(b"BEGIN PRIVATE KEY", decrypted)

    def test_login_returns_jwt(self):
        # Register user first
        User.objects.create_user(
            username="test_user",
            email="user@test.gov.in",
            password="testpassword",
            role="OFFICER"
        )
        url = reverse('auth_login')
        res = self.client.post(url, {"username": "test_user", "password": "testpassword"})
        self.assertEqual(res.statusCode if hasattr(res, 'statusCode') else res.status_code, status.HTTP_200_OK)
        res_data = res.json()
        self.assertIn("access_token", res_data)
        self.assertIn("refresh_token", res_data)
        self.assertEqual(res_data["user"]["role"], "OFFICER")
