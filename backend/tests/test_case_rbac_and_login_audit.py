from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from cases.models import Case, CaseAssignment
from audit.models import AuditLog

User = get_user_model()

class CaseRBACAndLoginAuditTestCase(APITestCase):
    def setUp(self):
        # Admin user
        self.admin = User.objects.create_superuser(
            username="admin_user",
            email="admin@gov.in",
            password="admin_password123",
            role="ADMIN"
        )
        # Judge user
        self.judge = User.objects.create_user(
            username="judge_user",
            email="judge@court.gov.in",
            password="judge_password123",
            role="JUDGE"
        )
        # Police Officer user
        self.officer = User.objects.create_user(
            username="officer_user",
            email="officer@police.gov.in",
            password="officer_password123",
            role="OFFICER"
        )

    def test_unassigned_case_not_visible_to_judge_or_officer(self):
        """Verify that newly created case without assignments is invisible to non-admins."""
        case = Case.objects.create(
            case_number="FIR-SECRET-2026",
            title="Classified Investigation",
            description="Initial unassigned docket",
            created_by=self.admin
        )

        # 1. Test Judge access
        self.client.force_authenticate(user=self.judge)
        res_cases = self.client.get(reverse('case-list'))
        self.assertEqual(res_cases.status_code, status.HTTP_200_OK)
        case_ids = [c['id'] for c in res_cases.json()]
        self.assertNotIn(str(case.id), case_ids)

        res_dockets = self.client.get('/api/cases/dockets/')
        self.assertEqual(res_dockets.status_code, status.HTTP_200_OK)
        docket_ids = [d['id'] for d in res_dockets.json()]
        self.assertNotIn(str(case.id), docket_ids)

        res_detail = self.client.get(reverse('case-detail', args=[case.id]))
        self.assertEqual(res_detail.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Test Police Officer access
        self.client.force_authenticate(user=self.officer)
        res_cases_off = self.client.get(reverse('case-list'))
        self.assertEqual(res_cases_off.status_code, status.HTTP_200_OK)
        case_ids_off = [c['id'] for c in res_cases_off.json()]
        self.assertNotIn(str(case.id), case_ids_off)

        res_dockets_off = self.client.get('/api/cases/dockets/')
        self.assertEqual(res_dockets_off.status_code, status.HTTP_200_OK)
        docket_ids_off = [d['id'] for d in res_dockets_off.json()]
        self.assertNotIn(str(case.id), docket_ids_off)

        res_detail_off = self.client.get(reverse('case-detail', args=[case.id]))
        self.assertEqual(res_detail_off.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Test Admin access (Admin sees all cases)
        self.client.force_authenticate(user=self.admin)
        res_admin = self.client.get(reverse('case-list'))
        self.assertEqual(res_admin.status_code, status.HTTP_200_OK)
        admin_case_ids = [c['id'] for c in res_admin.json()]
        self.assertIn(str(case.id), admin_case_ids)

    def test_case_becomes_visible_once_assigned(self):
        """Verify that assigning a role to a case immediately makes it accessible to that user."""
        case = Case.objects.create(
            case_number="FIR-ASSIGN-2026",
            title="Public Docket",
            description="Pending assignment",
            created_by=self.admin
        )

        # Assign Judge
        self.client.force_authenticate(user=self.admin)
        assign_res = self.client.post(
            f"/api/cases/{case.id}/assign/",
            {"user_id": str(self.judge.id), "assigned_role": "JUDGE"}
        )
        self.assertEqual(assign_res.status_code, status.HTTP_200_OK)

        # Judge now checks access
        self.client.force_authenticate(user=self.judge)
        res_cases = self.client.get(reverse('case-list'))
        case_ids = [c['id'] for c in res_cases.json()]
        self.assertIn(str(case.id), case_ids)

        res_dockets = self.client.get('/api/cases/dockets/')
        docket_ids = [d['id'] for d in res_dockets.json()]
        self.assertIn(str(case.id), docket_ids)

        res_detail = self.client.get(reverse('case-detail', args=[case.id]))
        self.assertEqual(res_detail.status_code, status.HTTP_200_OK)
        self.assertEqual(res_detail.json()["case_number"], "FIR-ASSIGN-2026")

        # Officer still cannot see it
        self.client.force_authenticate(user=self.officer)
        res_officer = self.client.get(reverse('case-detail', args=[case.id]))
        self.assertEqual(res_officer.status_code, status.HTTP_403_FORBIDDEN)

    def test_login_creates_case_level_audit_log(self):
        """Verify that logging in creates both global and case-level audit entries for assigned cases."""
        case = Case.objects.create(
            case_number="FIR-AUDIT-2026",
            title="Hashed Case",
            description="Testing login audit streams",
            created_by=self.admin
        )
        CaseAssignment.objects.create(case=case, user=self.judge, assigned_role="JUDGE")

        # Official Judge logs in via credentials
        login_url = reverse('auth_login')
        login_res = self.client.post(login_url, {
            "username": "judge_user",
            "password": "judge_password123"
        })
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)

        # 1. Global audit log exists (case=None)
        global_login_log = AuditLog.objects.filter(
            action='LOGIN',
            user=self.judge,
            case__isnull=True
        ).first()
        self.assertIsNotNone(global_login_log)

        # 2. Case-level audit log exists (case=case)
        case_login_log = AuditLog.objects.filter(
            action='LOGIN',
            user=self.judge,
            case=case
        ).first()
        self.assertIsNotNone(case_login_log)
        self.assertEqual(case_login_log.case_number, "FIR-AUDIT-2026")

        # 3. Case audit list endpoint returns the login event
        self.client.force_authenticate(user=self.judge)
        audit_res = self.client.get(f"/api/audit/logs/?case_id={case.id}")
        self.assertEqual(audit_res.status_code, status.HTTP_200_OK)
        actions = [log['action'] for log in audit_res.json()]
        self.assertIn('LOGIN', actions)
