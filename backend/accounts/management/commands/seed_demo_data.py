import uuid
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.utils import timezone
from cases.models import Case, CaseAssignment
from documents.models import Document
from documents.services import process_uploaded_document
from evidence.models import (
    StorageFacility, StorageLocation, Evidence, CustodyTransaction,
    MovementRequest, EvidenceConditionHistory, EvidenceSealHistory
)

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds database with realistic synthetic demo data for SIH-2026 presentation.'

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding synthetic demo data...")
        
        # 1. Create Demo Users (including admin abhi / 1234)
        users_data = [
            ("abhi", "ADMIN", "abhi@mha.gov.in", "1234"),
            ("admin_user", "ADMIN", "admin@mha.gov.in", "password123"),
            ("officer_sharma", "OFFICER", "sharma@mha.gov.in", "password123"),
            ("investigator_verma", "INVESTIGATOR", "verma@mha.gov.in", "password123"),
            ("legal_gupta", "LEGAL_OFFICER", "gupta@mha.gov.in", "password123"),
            ("judge_dixit", "JUDGE", "dixit@courts.gov.in", "password123"),
        ]
        
        seeded_users = {}
        for username, role, email, pwd in users_data:
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": email,
                    "role": role,
                    "is_staff": True if role == "ADMIN" else False,
                    "is_superuser": True if role == "ADMIN" else False,
                }
            )
            user.set_password(pwd)
            user.role = role
            user.is_staff = True if role == "ADMIN" else False
            user.is_superuser = True if role == "ADMIN" else False
            
            # Generate RSA keys if missing
            if not user.public_key:
                from accounts.crypto import generate_rsa_keypair, encrypt_private_key
                public_pem, private_pem = generate_rsa_keypair()
                enc_private = encrypt_private_key(private_pem, pwd)
                user.public_key = public_pem
                user.encrypted_private_key = enc_private
            
            user.save()
            if created:
                self.stdout.write(f"Created user {username} ({role})")
            else:
                self.stdout.write(f"Updated user {username} ({role}) with current password.")
            seeded_users[role] = user

        # 2. Create Cases
        cases_data = [
            ("FIR-2026-00445", "Synthetic Fraud Investigation - Vijay Mallya Case Linkage", "Investigation into offshore assets and bank linkage documents."),
            ("FIR-2026-00991", "Synthetic Cyber Crime - New Delhi Server Intrusion", "Unauthorized server access logs, IP traces, and digital evidence analysis.")
        ]
        
        seeded_cases = []
        for case_number, title, desc in cases_data:
            case, created = Case.objects.get_or_create(
                case_number=case_number,
                defaults={
                    "title": title,
                    "description": f"[DEMO ONLY - SYNTHETIC DATA] {desc}",
                    "created_by": seeded_users["OFFICER"]
                }
            )
            if created:
                self.stdout.write(f"Created case {case_number}")
            seeded_cases.append(case)

        # 3. Assign Investigator & Officer to Cases
        for case in seeded_cases:
            for role_key in ["INVESTIGATOR", "OFFICER", "LEGAL_OFFICER", "JUDGE"]:
                assignment, created = CaseAssignment.objects.get_or_create(
                    case=case,
                    user=seeded_users[role_key],
                    defaults={"assigned_role": f"PRIMARY_{role_key}"}
                )

        # 4. Upload Documents
        docs_data = [
            (
                seeded_cases[0],
                "First Information Report - Bank Fraud",
                "First Information Report filed under Section 154 CrPC. Complaining officer Inspector Sharma reports suspect Vijay Mallya transferred funds on 2026-03-12. Suspect resides in London. Witness contact phone number is 9876543210. Email address is ramesh@gmail.com."
            ),
            (
                seeded_cases[0],
                "Witness Testimony - Ramesh Kumar",
                "Witness Ramesh Kumar, residing at Mumbai, states he observed suspicious transaction confirmations. Suspect Vijay told him that transfers were authorized."
            ),
            (
                seeded_cases[1],
                "Intrusion Trace Logs",
                "Forensic Report from Cyber Cell. Servers in New Delhi detected unauthorized access on 2026-05-18 from IP 192.168.1.100. Critical system files were modified."
            )
        ]

        for case, title, content in docs_data:
            if not Document.objects.filter(case=case, title=title).exists():
                doc_file = ContentFile(content.encode('utf-8'), name=f"{title.lower().replace(' ', '_')}.txt")
                document = Document.objects.create(
                    case=case,
                    title=title,
                    file=doc_file,
                    uploaded_by=seeded_users["INVESTIGATOR"],
                    status='PROCESSING'
                )
                process_uploaded_document(document, doc_file)
                self.stdout.write(f"Uploaded and indexed document '{title}' in case {case.case_number}")

        # 5. Storage Facilities & Hierarchical Locations
        fac1, _ = StorageFacility.objects.get_or_create(
            facility_code="FAC-DEL-HQ",
            defaults={
                "name": "Delhi Police Central Headquarters Evidence Vault",
                "facility_type": "POLICE_STATION",
                "address": "Jai Singh Marg, Connaught Place",
                "city": "New Delhi",
                "state": "Delhi",
                "pincode": "110001"
            }
        )
        fac2, _ = StorageFacility.objects.get_or_create(
            facility_code="FAC-FSL-ROHINI",
            defaults={
                "name": "Forensic Science Laboratory (FSL) Rohini",
                "facility_type": "FORENSIC_LAB",
                "address": "Sector 14, Rohini",
                "city": "New Delhi",
                "state": "Delhi",
                "pincode": "110085"
            }
        )

        loc1, _ = StorageLocation.objects.get_or_create(
            location_code="LOC-DEL-HQ-VAULT1-RK2-SH4-LK17",
            defaults={
                "facility": fac1,
                "building": "Main Evidence Block",
                "floor": "Basement 1",
                "room": "High-Security Vault A",
                "rack": "Rack B",
                "shelf": "Shelf 04",
                "locker": "Locker 17",
                "container": "Container 03",
                "slot": "Slot 12",
                "capacity": 5,
                "is_occupied": True
            }
        )
        loc2, _ = StorageLocation.objects.get_or_create(
            location_code="LOC-FSL-LAB3-CAB02",
            defaults={
                "facility": fac2,
                "building": "Forensics Annex",
                "floor": "2nd Floor",
                "room": "Digital Forensic Lab 3",
                "rack": "Bench 01",
                "shelf": "Shelf 02",
                "locker": "Cabinet 02",
                "capacity": 10,
                "is_occupied": False
            }
        )

        # 6. Seed Physical Evidence Items
        ev1, created = Evidence.objects.get_or_create(
            evidence_number="EVD-2026-000001",
            defaults={
                "case": seeded_cases[0],
                "fir_number": "FIR-2026-00445",
                "evidence_type": "DIGITAL",
                "category": "Encrypted iPhone 14 Pro",
                "title": "Suspect's Primary Mobile Device (Recovered at Airport)",
                "description": "Black Apple iPhone 14 Pro Max seized under Section 102 CrPC. Contains encrypted WhatsApp chats and offshore banking credentials.",
                "status": "IN_STORAGE",
                "sensitivity_level": "HIGH",
                "collected_at": timezone.now() - timezone.timedelta(days=12),
                "collected_by": seeded_users["OFFICER"],
                "current_custodian": seeded_users["INVESTIGATOR"],
                "responsible_officer": seeded_users["OFFICER"],
                "current_location": loc1,
                "length": 16.0,
                "width": 7.8,
                "height": 0.8,
                "weight": 240.0,
                "quantity": 1,
                "color": "Space Black",
                "material": "Glass / Titanium",
                "serial_number": "F2LZ89P9MD6R",
                "model_number": "A2894",
                "manufacturer": "Apple Inc.",
                "identifying_marks": "Minor scratch near lightning port, cracked glass screen protector.",
                "packaging_type": "Faraday Anti-Static Security Pouch",
                "current_seal_number": "SEAL-IND-884920",
                "seal_condition": "INTACT",
                "current_condition": "INTACT",
                "custom_attributes": {
                    "imei_1": "358920119284019",
                    "imei_2": "358920119284027",
                    "storage_capacity": "512 GB",
                    "battery_level_at_seizure": "78%"
                }
            }
        )

        ev2, created = Evidence.objects.get_or_create(
            evidence_number="EVD-2026-000002",
            defaults={
                "case": seeded_cases[1],
                "fir_number": "FIR-2026-00991",
                "evidence_type": "DIGITAL",
                "category": "Hard Drive",
                "title": "Seized Server NVMe Solid State Drive (1TB)",
                "description": "Samsung 980 Pro NVMe SSD containing raw packet captures and attack vectors.",
                "status": "IN_STORAGE",
                "sensitivity_level": "RESTRICTED",
                "collected_at": timezone.now() - timezone.timedelta(days=8),
                "collected_by": seeded_users["INVESTIGATOR"],
                "current_custodian": seeded_users["INVESTIGATOR"],
                "responsible_officer": seeded_users["OFFICER"],
                "current_location": loc1,
                "length": 8.0,
                "width": 2.2,
                "height": 0.2,
                "weight": 9.0,
                "quantity": 1,
                "color": "Black",
                "material": "Silicon / PCB",
                "serial_number": "S69ENF0R918234",
                "model_number": "MZ-V8P1T0B",
                "manufacturer": "Samsung Electronics",
                "packaging_type": "Anti-Static Shield Bag",
                "current_seal_number": "SEAL-IND-994102",
                "seal_condition": "INTACT",
                "current_condition": "INTACT",
                "custom_attributes": {
                    "capacity_gb": 1000,
                    "filesystem": "EXT4",
                    "sector_size": "512e"
                }
            }
        )

        # 7. Seed Initial Custody and Movement
        CustodyTransaction.objects.get_or_create(
            evidence=ev1,
            transfer_reason="Initial Seizure & Intake into Vault",
            defaults={
                "previous_custodian": None,
                "new_custodian": seeded_users["INVESTIGATOR"],
                "previous_location": None,
                "new_location": loc1,
                "requested_by": seeded_users["OFFICER"],
                "received_by": seeded_users["INVESTIGATOR"],
                "status": "COMPLETED",
                "remarks": "Intake completed at Delhi Police HQ Vault."
            }
        )

        MovementRequest.objects.get_or_create(
            request_number="MOV-2026-00001",
            defaults={
                "evidence": ev1,
                "current_location": loc1,
                "requested_destination": loc2,
                "external_destination_notes": "Forensic Science Laboratory (FSL) Rohini - Cyber Forensics Division",
                "purpose": "FORENSIC_EXAMINATION",
                "reason": "Extraction of encrypted chats, SIM data, and forensic image acquisition.",
                "requested_by": seeded_users["INVESTIGATOR"],
                "expected_return_date": timezone.now() + timezone.timedelta(days=14),
                "status": "PENDING",
                "required_approval_role": "ADMIN",
                "approval_notes": ""
            }
        )

        self.stdout.write(self.style.SUCCESS("Database seeding with Physical Evidence completed successfully."))
