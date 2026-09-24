from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = "Seed demo users for all SDMS roles in production"

    def handle(self, *args, **options):
        User = get_user_model()
        demo_users = [
            {
                'username': 'admin',
                'email': 'admin@sdms.gov.in',
                'role': 'ADMIN',
                'first_name': 'System',
                'last_name': 'Administrator',
                'is_staff': True,
                'is_superuser': True,
            },
            {
                'username': 'abhi',
                'email': 'abhi@sdms.gov.in',
                'role': 'ADMIN',
                'first_name': 'Abhishek',
                'last_name': 'Nanda',
                'is_staff': True,
                'is_superuser': True,
            },
            {
                'username': 'police_officer',
                'email': 'police@sdms.gov.in',
                'role': 'OFFICER',
                'first_name': 'Vikram',
                'last_name': 'Singh',
                'is_staff': False,
                'is_superuser': False,
            },
            {
                'username': 'investigator_user',
                'email': 'investigator@sdms.gov.in',
                'role': 'INVESTIGATOR',
                'first_name': 'Pooja',
                'last_name': 'Sharma',
                'is_staff': False,
                'is_superuser': False,
            },
            {
                'username': 'legal_officer',
                'email': 'legal@sdms.gov.in',
                'role': 'LEGAL_OFFICER',
                'first_name': 'Rajesh',
                'last_name': 'Khanna',
                'is_staff': False,
                'is_superuser': False,
            },
            {
                'username': 'judge_user',
                'email': 'judge@sdms.gov.in',
                'role': 'JUDGE',
                'first_name': 'Ananya',
                'last_name': 'Deshmukh',
                'is_staff': False,
                'is_superuser': False,
            },
        ]

        for u in demo_users:
            user = User.objects.filter(username=u['username']).first()
            if not user:
                user = User.objects.create_user(
                    username=u['username'],
                    email=u['email'],
                    password='password123',
                    role=u['role'],
                    first_name=u['first_name'],
                    last_name=u['last_name'],
                    is_staff=u['is_staff'],
                    is_superuser=u['is_superuser'],
                )
                self.stdout.write(self.style.SUCCESS(f"Created demo user: {user.username} ({user.role})"))
            else:
                self.stdout.write(f"User {user.username} already exists.")
