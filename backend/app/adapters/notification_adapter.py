# =============================================================================
# PATTERN: ADAPTER
# =============================================================================
#
# Problem:
#   Our internal notification system works with NotificationRecord objects.
#   External providers (email services, SMS services, push notification APIs)
#   each have different interfaces and method signatures.
#   We cannot modify the external provider's interface.
#
# Solution:
#   Create an Adapter that wraps any external provider and converts its
#   interface to match our internal NotificationService interface.
#   The rest of the system only knows the internal interface — it never
#   talks to the external provider directly.
#
# Architecture:
#   NotificationService (our internal interface)
#   MockEmailProvider   (simulates an external email service)
#   EmailNotificationAdapter → wraps MockEmailProvider to fit our interface
#
# Real world extension:
#   To add SendGrid: create SendGridAdapter(NotificationService) — no other change.
# =============================================================================

from abc import ABC, abstractmethod


# ─────────────────────────────────────────────
# Our Internal Interface (what the system uses)
# ─────────────────────────────────────────────

class NotificationService(ABC):
    """
    Internal notification interface that the rest of the system depends on.
    Any external provider must be adapted to implement this.
    """

    @abstractmethod
    def send(self, user_id: int, message: str, incident_id: int) -> bool:
        """Send a notification. Returns True on success."""
        pass


# ─────────────────────────────────────────────
# External Provider (incompatible interface)
# ─────────────────────────────────────────────

class MockEmailProvider:
    """
    Simulates a third-party email provider with its own interface.
    We cannot change this class — it's "external".
    Its method signature is different from what we want.
    """

    def send_email(
        self,
        recipient_id: str,       # uses str, not int
        subject: str,
        body: str,
        metadata: dict,
    ) -> dict:
        """
        External provider's method — incompatible with our NotificationService.
        """
        print(
            f"[MockEmailProvider] -> Email to user#{recipient_id} | "
            f"Subject: {subject} | Body: {body}"
        )
        return {"status": "sent", "provider": "MockEmail"}


class MockSMSProvider:
    """
    Simulates a third-party SMS provider with yet another different interface.
    """

    def dispatch_sms(
        self,
        phone_number: str,
        text: str,
    ) -> bool:
        print(f"[MockSMSProvider] -> SMS to {phone_number}: {text}")
        return True


# ─────────────────────────────────────────────
# Adapters — bridge between them
# ─────────────────────────────────────────────

class EmailNotificationAdapter(NotificationService):
    """
    Adapter: Wraps MockEmailProvider to implement our NotificationService.
    Converts our internal send(user_id, message, incident_id)
    → into the external send_email(recipient_id, subject, body, metadata).
    """

    def __init__(self, email_provider: MockEmailProvider):
        self._provider = email_provider

    def send(self, user_id: int, message: str, incident_id: int) -> bool:
        result = self._provider.send_email(
            recipient_id=str(user_id),           # int → str (adapter converts)
            subject=f"Campus Crisis Update - Incident #{incident_id}",
            body=message,
            metadata={"incident_id": incident_id}
        )
        return result.get("status") == "sent"


class SMSNotificationAdapter(NotificationService):
    """
    Adapter: Wraps MockSMSProvider to implement our NotificationService.
    In a real system, user_id would be resolved to a phone number from the DB.
    """

    def __init__(self, sms_provider: MockSMSProvider):
        self._provider = sms_provider

    def send(self, user_id: int, message: str, incident_id: int) -> bool:
        # In production: look up phone number from DB
        phone = f"+91-MOCK-{user_id:04d}"
        return self._provider.dispatch_sms(
            phone_number=phone,
            text=f"Incident #{incident_id}: {message}"
        )


# ─────────────────────────────────────────────
# Factory function — returns the active adapter
# ─────────────────────────────────────────────

def get_notification_service() -> NotificationService:
    """
    Returns the active notification service.
    Change this one function to switch providers globally.
    """
    return EmailNotificationAdapter(MockEmailProvider())
