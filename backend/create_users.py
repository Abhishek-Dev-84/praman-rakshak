import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import User

users_data = [
    {
        "username": "admin_user",
        "email": "admin@sdms.gov.in",
        "password": "Password@123",
        "role": "ADMIN",
        "first_name": "Abhishek",
        "last_name": "Nanda (Admin)",
        "is_staff": True,
        "is_superuser": True,
    },
    {
        "username": "police_officer",
        "email": "police@sdms.gov.in",
        "password": "Password@123",
        "role": "OFFICER",
        "first_name": "Ramesh",
        "last_name": "Kumar (Inspector)",
        "is_staff": False,
        "is_superuser": False,
    },
    {
        "username": "investigator_user",
        "email": "investigator@sdms.gov.in",
        "password": "Password@123",
        "role": "INVESTIGATOR",
        "first_name": "Suresh",
        "last_name": "Verma (Forensic IO)",
        "is_staff": False,
        "is_superuser": False,
    },
    {
        "username": "legal_officer",
        "email": "legal@sdms.gov.in",
        "password": "Password@123",
        "role": "LEGAL_OFFICER",
        "first_name": "Pooja",
        "last_name": "Gupta (Prosecutor)",
        "is_staff": False,
        "is_superuser": False,
    },
    {
        "username": "judge_user",
        "email": "judge@sdms.gov.in",
        "password": "Password@123",
        "role": "JUDGE",
        "first_name": "Hon. Justice",
        "last_name": "Dixit",
        "is_staff": False,
        "is_superuser": False,
    },
]

print("=== Creating / Updating Role Users ===")
for data in users_data:
    user, created = User.objects.get_or_create(
        username=data["username"],
        defaults={
            "email": data["email"],
            "role": data["role"],
            "first_name": data["first_name"],
            "last_name": data["last_name"],
            "is_staff": data["is_staff"],
            "is_superuser": data["is_superuser"],
        }
    )
    user.set_password(data["password"])
    user.email = data["email"]
    user.role = data["role"]
    user.first_name = data["first_name"]
    user.last_name = data["last_name"]
    user.is_staff = data["is_staff"]
    user.is_superuser = data["is_superuser"]
    user.is_active = True
    user.save()
    status = "Created" if created else "Updated"
    print(f"[{status}] Username: {user.username} | Role: {user.role} | Email: {user.email}")

print("=== All role users successfully created and active! ===")
