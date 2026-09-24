import uuid
from django.db import models
from django.contrib.auth import get_user_model
from cases.models import Case

User = get_user_model()

class StorageFacility(models.Model):
    """Physical storage facility, e.g. Police Station, Forensic Lab, Court Vault."""
    FACILITY_TYPE_CHOICES = [
        ('POLICE_STATION', 'Police Station'),
        ('FORENSIC_LAB', 'Forensic Laboratory'),
        ('COURT_VAULT', 'Judicial Court Vault'),
        ('CENTRAL_WAREHOUSE', 'Central Evidence Warehouse'),
        ('SPECIAL_CELL', 'Special Cell Vault'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    facility_code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=255)
    facility_type = models.CharField(max_length=50, choices=FACILITY_TYPE_CHOICES, default='POLICE_STATION')
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, default='New Delhi')
    state = models.CharField(max_length=100, default='Delhi')
    pincode = models.CharField(max_length=20, default='110001')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} [{self.facility_code}]"


class StorageLocation(models.Model):
    """
    Hierarchical Physical Storage Location.
    Structure: Facility → Building → Floor → Room → Rack → Shelf → Locker → Container → Slot
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    facility = models.ForeignKey(StorageFacility, on_delete=models.CASCADE, related_name='locations')
    building = models.CharField(max_length=100, default='Main Block')
    floor = models.CharField(max_length=50, default='Ground Floor')
    room = models.CharField(max_length=100, default='Evidence Room A')
    rack = models.CharField(max_length=50, blank=True, default='Rack 01')
    shelf = models.CharField(max_length=50, blank=True, default='Shelf 01')
    locker = models.CharField(max_length=50, blank=True, default='Locker 01')
    container = models.CharField(max_length=50, blank=True, default='')
    slot = models.CharField(max_length=50, blank=True, default='')
    location_code = models.CharField(max_length=100, unique=True)
    capacity = models.PositiveIntegerField(default=10)
    is_occupied = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['facility', 'building', 'room', 'rack', 'shelf', 'locker']

    @property
    def hierarchy_path(self):
        parts = [self.facility.name, self.building, self.floor, self.room]
        if self.rack: parts.append(self.rack)
        if self.shelf: parts.append(self.shelf)
        if self.locker: parts.append(self.locker)
        if self.container: parts.append(self.container)
        if self.slot: parts.append(self.slot)
        return " → ".join(parts)

    def __str__(self):
        return f"{self.location_code} ({self.hierarchy_path})"


class Evidence(models.Model):
    """
    Comprehensive Physical & Digital Evidence Record.
    """
    EVIDENCE_TYPE_CHOICES = [
        ('PHYSICAL', 'Physical Object'),
        ('DIGITAL', 'Digital / Electronic Device'),
        ('BIOLOGICAL', 'Biological / Forensic Sample'),
        ('DOCUMENTARY', 'Physical Document / Paper'),
        ('FIREARM', 'Firearm / Weapon / Ballistics'),
        ('NARCOTICS', 'Narcotics / Chemical Substance'),
        ('VALUABLE', 'Valuables / Currency / Jewellery'),
        ('OTHER', 'Other Physical Evidence'),
    ]

    STATUS_CHOICES = [
        ('REGISTERED', 'Collected & Registered'),
        ('IN_STORAGE', 'Securely Stored in Vault'),
        ('MOVEMENT_PENDING', 'Movement Pending Approval'),
        ('IN_TRANSIT', 'In Transit'),
        ('IN_FORENSIC_LAB', 'At Forensic Lab for Analysis'),
        ('IN_COURT', 'Presented in Court'),
        ('RELEASED_TEMPORARY', 'Temporarily Released for Investigation'),
        ('DISPOSED', 'Disposed by Court Order'),
        ('ARCHIVED', 'Archived / Closed Case'),
    ]

    SENSITIVITY_CHOICES = [
        ('LOW', 'Low / Standard Evidence'),
        ('MEDIUM', 'Medium Sensitivity'),
        ('HIGH', 'High Sensitivity / Strict Approval'),
        ('RESTRICTED', 'Restricted / Classified Court Custody'),
    ]

    SEAL_CONDITION_CHOICES = [
        ('INTACT', 'Seal Intact & Verified'),
        ('DAMAGED', 'Seal Damaged / Tampered'),
        ('BROKEN_AUTHORIZED', 'Seal Opened with Authorization'),
        ('RESEALED', 'Resealed with New Number'),
    ]

    CONDITION_CHOICES = [
        ('INTACT', 'Intact / Excellent Condition'),
        ('GOOD', 'Good / Minor Wear'),
        ('FAIR', 'Fair / Noticeable Degradation'),
        ('DAMAGED', 'Damaged / Broken'),
        ('CONTAMINATED', 'Contaminated / Compromised'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    evidence_number = models.CharField(max_length=100, unique=True, db_index=True)
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='evidence_items')
    fir_number = models.CharField(max_length=100, blank=True)
    evidence_type = models.CharField(max_length=50, choices=EVIDENCE_TYPE_CHOICES, default='PHYSICAL')
    category = models.CharField(max_length=100, default='General Physical Item')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='IN_STORAGE')
    sensitivity_level = models.CharField(max_length=20, choices=SENSITIVITY_CHOICES, default='MEDIUM')
    
    # Ownership & Custody
    collected_at = models.DateTimeField(null=True, blank=True)
    registered_at = models.DateTimeField(auto_now_add=True)
    collected_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='collected_evidence')
    current_custodian = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='custodian_evidence')
    responsible_officer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='managed_evidence')
    
    # Storage Hierarchy
    current_location = models.ForeignKey(StorageLocation, on_delete=models.SET_NULL, null=True, blank=True, related_name='stored_evidence')
    previous_location = models.ForeignKey(StorageLocation, on_delete=models.SET_NULL, null=True, blank=True, related_name='former_evidence')
    storage_location_name = models.CharField(max_length=255, blank=True, default='', help_text="Vault / rack / locker storage location text")

    # Physical Dimensions & Measurements
    length = models.FloatField(null=True, blank=True, help_text="Length in cm")
    width = models.FloatField(null=True, blank=True, help_text="Width in cm")
    height = models.FloatField(null=True, blank=True, help_text="Height in cm")
    depth = models.FloatField(null=True, blank=True)
    diameter = models.FloatField(null=True, blank=True)
    weight = models.FloatField(null=True, blank=True, help_text="Weight in grams/kg")
    volume = models.FloatField(null=True, blank=True, help_text="Volume in ml/litres")
    quantity = models.PositiveIntegerField(default=1)
    color = models.CharField(max_length=50, blank=True)
    material = models.CharField(max_length=100, blank=True)
    shape = models.CharField(max_length=50, blank=True)
    
    # Identifiers & Seals
    serial_number = models.CharField(max_length=150, blank=True)
    model_number = models.CharField(max_length=150, blank=True)
    manufacturer = models.CharField(max_length=150, blank=True)
    identifying_marks = models.TextField(blank=True)
    packaging_type = models.CharField(max_length=100, default='Tamper-Evident Security Bag')
    current_seal_number = models.CharField(max_length=100, blank=True)
    seal_condition = models.CharField(max_length=50, choices=SEAL_CONDITION_CHOICES, default='INTACT')
    current_condition = models.CharField(max_length=50, choices=CONDITION_CHOICES, default='INTACT')
    
    # Dynamic Schema Extension (JSONField for specific category metadata e.g. IMEI, OS, Temp, Calibre)
    custom_attributes = models.JSONField(default=dict, blank=True)
    
    # Fast Reference QR Token
    qr_code_token = models.CharField(max_length=150, unique=True, blank=True)

    class Meta:
        ordering = ['-registered_at']
        indexes = [
            models.Index(fields=['case', 'status']),
            models.Index(fields=['evidence_number']),
            models.Index(fields=['current_location']),
        ]

    def save(self, *args, **kwargs):
        if not self.evidence_number:
            # Generate sequential/unique formatted evidence ID: EVD-2026-XXXXXX
            count = Evidence.objects.count() + 1
            self.evidence_number = f"EVD-2026-{count:06d}"
        if not self.qr_code_token:
            self.qr_code_token = f"SDMS:EVD:{self.evidence_number}:{self.id}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.evidence_number} - {self.title} [{self.status}]"


class EvidenceMedia(models.Model):
    """
    Multimedia Documentation (Photos, Videos, Scans) of Evidence.
    """
    MEDIA_TYPE_CHOICES = [
        ('PHOTO', 'Photograph'),
        ('VIDEO', 'Video Recording'),
        ('DOCUMENT', 'Lab Certificate / Document'),
        ('3D_SCAN', '3D Scan / Photogrammetry'),
        ('OTHER', 'Other Media'),
    ]

    CATEGORY_CHOICES = [
        ('COLLECTION_SITE', 'Crime Scene / Collection Site'),
        ('CLOSE_UP', 'High-Res Close-up'),
        ('PACKAGING', 'Packaging & Box Photo'),
        ('SEAL_PHOTO', 'Tamper Seal Photo'),
        ('STORAGE_LOCATION', 'Storage Vault Placement'),
        ('DAMAGE_REPORT', 'Damage / Degradation Inspection'),
        ('GENERAL', 'General Evidence Photo'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    evidence = models.ForeignKey(Evidence, on_delete=models.CASCADE, related_name='media_files')
    file = models.FileField(upload_to='evidence_media/')
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=20, choices=MEDIA_TYPE_CHOICES, default='PHOTO')
    media_category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='GENERAL')
    file_size = models.BigIntegerField(default=0)
    checksum_sha256 = models.CharField(max_length=64, blank=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    description = models.TextField(blank=True)
    version = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"Media {self.file_name} for {self.evidence.evidence_number}"


class CustodyTransaction(models.Model):
    """
    Immutable Chain of Custody Transaction Log.
    Every change of possession or location creates a cryptographically recorded transaction.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    evidence = models.ForeignKey(Evidence, on_delete=models.CASCADE, related_name='custody_transactions')
    previous_custodian = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='custody_released')
    new_custodian = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='custody_received')
    previous_location = models.ForeignKey(StorageLocation, on_delete=models.SET_NULL, null=True, blank=True, related_name='custody_origin')
    new_location = models.ForeignKey(StorageLocation, on_delete=models.SET_NULL, null=True, blank=True, related_name='custody_destination')
    transfer_reason = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    requested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='custody_requested')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='custody_approved')
    released_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='transfers_released')
    received_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='transfers_received')
    digital_signature = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=50, default='COMPLETED')
    remarks = models.TextField(blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        prev = self.previous_custodian.username if self.previous_custodian else 'None'
        curr = self.new_custodian.username if self.new_custodian else 'None'
        return f"Custody transfer of {self.evidence.evidence_number}: {prev} → {curr} at {self.timestamp}"


class MovementRequest(models.Model):
    """
    Formal Physical Evidence Movement Request & Multi-Step Release/Receive Workflow.
    """
    PURPOSE_CHOICES = [
        ('COURT_PROCEEDING', 'Presentation in Judicial Court'),
        ('FORENSIC_EXAMINATION', 'Forensic Science Laboratory (FSL) Analysis'),
        ('INTER_FACILITY_TRANSFER', 'Inter-Facility Storage Transfer'),
        ('TEMPORARY_INVESTIGATION', 'Investigative Inspection & Interrogation'),
        ('DISPOSAL', 'Authorized Disposal / Destruction'),
        ('RETURN_TO_OWNER', 'Court-Ordered Return to Owner'),
    ]

    STATUS_CHOICES = [
        ('PENDING', 'Pending Supervisor / Judicial Approval'),
        ('APPROVED', 'Approved — Ready for Secure Release'),
        ('REJECTED', 'Movement Request Rejected'),
        ('IN_TRANSIT', 'Released from Storage & In Transit'),
        ('RECEIVED', 'Received & Verified at Destination'),
        ('RETURNED', 'Returned to Original Vault'),
        ('CANCELLED', 'Request Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request_number = models.CharField(max_length=100, unique=True, db_index=True)
    evidence = models.ForeignKey(Evidence, on_delete=models.CASCADE, related_name='movement_requests')
    current_location = models.ForeignKey(StorageLocation, on_delete=models.SET_NULL, null=True, related_name='moves_out')
    requested_destination = models.ForeignKey(StorageLocation, on_delete=models.SET_NULL, null=True, blank=True, related_name='moves_in')
    external_destination_notes = models.CharField(max_length=255, blank=True, help_text="e.g. High Court Bench 4 or FSL Rohini")
    purpose = models.CharField(max_length=50, choices=PURPOSE_CHOICES, default='FORENSIC_EXAMINATION')
    reason = models.TextField()
    requested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='movements_created')
    requested_at = models.DateTimeField(auto_now_add=True)
    expected_return_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='PENDING')
    required_approval_role = models.CharField(max_length=50, default='INVESTIGATOR')
    
    # Multi-Step Approvals & Signatures
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='movements_approved')
    approved_at = models.DateTimeField(null=True, blank=True)
    approval_notes = models.TextField(blank=True)
    approval_signature = models.TextField(blank=True, null=True)

    # Step 4: Release
    released_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='movements_dispatched')
    released_at = models.DateTimeField(null=True, blank=True)
    release_condition = models.CharField(max_length=50, default='INTACT')
    release_seal_condition = models.CharField(max_length=50, default='INTACT')

    # Step 6: Receipt Confirmation
    received_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='movements_accepted')
    received_at = models.DateTimeField(null=True, blank=True)
    receive_condition = models.CharField(max_length=50, default='INTACT')
    receive_seal_condition = models.CharField(max_length=50, default='INTACT')
    receiving_remarks = models.TextField(blank=True)

    class Meta:
        ordering = ['-requested_at']

    def save(self, *args, **kwargs):
        if not self.request_number:
            count = MovementRequest.objects.count() + 1
            self.request_number = f"MOV-2026-{count:05d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.request_number} for {self.evidence.evidence_number} [{self.status}]"


class EvidenceConditionHistory(models.Model):
    """Historical Audit of Physical Evidence Condition."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    evidence = models.ForeignKey(Evidence, on_delete=models.CASCADE, related_name='condition_history')
    previous_condition = models.CharField(max_length=50)
    new_condition = models.CharField(max_length=50)
    reason = models.TextField()
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    related_movement = models.ForeignKey(MovementRequest, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"Condition changed for {self.evidence.evidence_number}: {self.previous_condition} → {self.new_condition}"


class EvidenceSealHistory(models.Model):
    """Historical Audit of Evidence Security Seals."""
    ACTION_CHOICES = [
        ('INITIAL_SEAL', 'Initial Tamper Seal Applied'),
        ('VERIFIED_INTACT', 'Routine Seal Verification (Intact)'),
        ('BROKEN_FOR_INSPECTION', 'Seal Broken with Judicial / Lab Approval'),
        ('RESEALED', 'Resealed with New Number'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    evidence = models.ForeignKey(Evidence, on_delete=models.CASCADE, related_name='seal_history')
    seal_number = models.CharField(max_length=100)
    seal_type = models.CharField(max_length=100, default='Tamper-Evident Barcoded Strip')
    action = models.CharField(max_length=50, choices=ACTION_CHOICES, default='INITIAL_SEAL')
    seal_condition = models.CharField(max_length=50, default='INTACT')
    reason = models.TextField(blank=True)
    operator = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='seal_actions')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='seal_approvals')
    timestamp = models.DateTimeField(auto_now_add=True)
    new_seal_number = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"Seal {self.seal_number} ({self.action}) on {self.evidence.evidence_number}"
