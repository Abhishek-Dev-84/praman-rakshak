from rest_framework import serializers
from django.contrib.auth import get_user_model
from .crypto import generate_rsa_keypair, encrypt_private_key

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'role', 'is_active', 'public_key', 'created_at')
        read_only_fields = ('id', 'public_key', 'created_at')

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'role')

    def create(self, validated_data):
        password = validated_data.pop('password')
        role = validated_data.get('role', 'OFFICER')
        
        # Generate RSA keys
        public_pem, private_pem = generate_rsa_keypair()
        
        # Encrypt private key with user password
        enc_private = encrypt_private_key(private_pem, password)
        
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=password,
            role=role,
            public_key=public_pem,
            encrypted_private_key=enc_private
        )
        return user
