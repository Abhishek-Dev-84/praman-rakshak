from django.urls import path
from .webauthn import register_options, register_verify, auth_options, auth_verify

urlpatterns = [
    path('register-options/', register_options, name='webauthn_register_options'),
    path('register-verify/', register_verify, name='webauthn_register_verify'),
    path('auth-options/', auth_options, name='webauthn_auth_options'),
    path('auth-verify/', auth_verify, name='webauthn_auth_verify'),
]
