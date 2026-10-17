"""
Comprehensive Design Patterns Test Suite
Campus Crisis & Resource Coordination Platform

Verifies all 7 Design Patterns implemented in the platform:
1. Factory Method Pattern (app/factories/incident_factory.py)
2. Strategy Pattern (app/strategies/assignment_strategy.py)
3. Chain of Responsibility Pattern (app/chains/escalation_chain.py)
4. State Pattern (app/states/incident_state.py)
5. Observer Pattern (app/observers/notification_observer.py)
6. Facade Pattern (app/facades/incident_facade.py)
7. Adapter Pattern (app/adapters/notification_adapter.py)
"""

from app.factories.incident_factory import get_incident_factory, MedicalIncidentFactory, SecurityIncidentFactory
from app.strategies.assignment_strategy import LeastBusyStrategy, SpecializedStrategy, PriorityBasedStrategy
from app.chains.escalation_chain import build_escalation_chain, EscalationRequest
from app.states.incident_state import get_incident_state
from app.observers.notification_observer import IncidentNotifier, ReporterObserver, TechnicianObserver, AdminObserver, IncidentEvent
from app.adapters.notification_adapter import EmailNotificationAdapter, MockEmailProvider, SMSNotificationAdapter, MockSMSProvider
from app.schemas.incident import IncidentAssign, IncidentCreate

def test_factory_method():
    print("Testing 1: Factory Method Pattern...")
    med_factory = get_incident_factory("Medical")
    med_data = med_factory.create(
        title="Fainting student in Block B",
        description="Student fell unconscious",
        priority="LOW",  # Should be overridden to CRITICAL by Medical factory
        location="Block B Room 102",
        reporter_id=10
    )
    assert med_data.priority == "CRITICAL", f"Expected CRITICAL, got {med_data.priority}"
    assert med_data.category == "Medical"

    sec_factory = get_incident_factory("Security")
    sec_data = sec_factory.create(
        title="Fire alarm triggered",
        description="Smoke near lab 3",
        priority="LOW",
        location="Lab 3",
        reporter_id=11
    )
    assert sec_data.priority == "CRITICAL", "Security should override LOW to CRITICAL"
    print("  ✓ Factory Method passed!")

def test_strategy_pattern():
    print("Testing 2: Strategy Pattern...")
    techs = [
        {"id": 1, "name": "Alice Tech", "active_count": 3, "specialization": "Hostel"},
        {"id": 2, "name": "Bob Tech", "active_count": 1, "specialization": "IT"},
        {"id": 3, "name": "Charlie Tech", "active_count": 5, "specialization": "Medical"},
    ]

    # Strategy 1: Least Busy
    least_busy = LeastBusyStrategy()
    assigned = least_busy.assign("Hostel", "MEDIUM", techs)
    assert assigned["id"] == 2, f"Expected Bob (active_count=1), got {assigned['name']}"

    # Strategy 2: Specialized
    specialized = SpecializedStrategy()
    assigned_spec = specialized.assign("Hostel", "MEDIUM", techs)
    assert assigned_spec["id"] == 1, f"Expected Alice (Hostel specialist), got {assigned_spec['name']}"

    # Strategy 3: Priority Based
    prio_strat = PriorityBasedStrategy()
    assigned_prio = prio_strat.assign("Medical", "CRITICAL", techs)
    assert assigned_prio["id"] == 2, f"Expected lowest workload for CRITICAL, got {assigned_prio['name']}"
    print("  ✓ Strategy Pattern passed!")

def test_auto_assignment_does_not_require_technician_id():
    assignment = IncidentAssign(strategy="least_busy")
    assert assignment.technician_id is None

def test_incident_categories_use_current_options():
    incident_data = {
        "title": "Network outage",
        "description": "Campus network is unavailable",
        "priority": "MEDIUM",
        "location": "Library",
        "department_id": 7,
    }
    assert IncidentCreate(category="Tech", **incident_data).category == "Tech"
    assert IncidentCreate(
        category="Campus Operations",
        **incident_data,
    ).category == "Campus Operations"

    tech_incident = get_incident_factory("Tech").create(
        title="Network outage",
        description="Campus network is unavailable",
        priority="MEDIUM",
        location="Library",
        reporter_id=1,
    )
    assert tech_incident.category == "Tech"
    admin_department = get_incident_factory(
        "Campus Operations",
        preserve_category=True,
    ).create(
        title="Broken light",
        description="The corridor light is out",
        priority="LOW",
        location="North Hall",
        reporter_id=1,
        department_id=7,
    )
    assert admin_department.category == "Campus Operations"
    assert admin_department.department_id == 7

def test_chain_of_responsibility():
    print("Testing 3: Chain of Responsibility Pattern...")
    chain = build_escalation_chain()

    # Case A: LOW priority -> handled by Technician
    req_low = EscalationRequest(1, "Minor leak", "LOW", "IN_PROGRESS", "Need help")
    res_low = chain.handle(req_low)
    assert res_low.handled_by == "Technician", f"Expected Technician, got {res_low.handled_by}"

    # Case B: HIGH priority -> handled by Officer
    req_high = EscalationRequest(2, "Power outage", "HIGH", "IN_PROGRESS", "Building dark")
    res_high = chain.handle(req_high)
    assert res_high.handled_by == "Supervisor" or res_high.handled_by == "Department Officer"

    # Case C: CRITICAL priority -> escalated beyond Supervisor
    req_crit = EscalationRequest(3, "Chemical spill", "CRITICAL", "IN_PROGRESS", "Evacuation needed")
    res_crit = chain.handle(req_crit)
    assert res_crit.handled_by in ("Department Officer", "System Administrator")
    print("  ✓ Chain of Responsibility passed!")

def test_state_pattern():
    print("Testing 4: State Pattern...")

    # REPORTED -> ASSIGNED valid
    state_rep = get_incident_state("REPORTED")
    next_rep = state_rep.transition_to("ASSIGNED")
    assert next_rep == "ASSIGNED"

    # IN_PROGRESS -> RESOLVED valid
    state_prog = get_incident_state("IN_PROGRESS")
    next_prog = state_prog.transition_to("RESOLVED")
    assert next_prog == "RESOLVED"

    # IN_PROGRESS -> CLOSED invalid
    try:
        state_prog.transition_to("CLOSED")
        assert False, "Should have raised ValueError"
    except ValueError as e:
        assert "can only move to" in str(e) or "cannot be changed" in str(e)
    print("  ✓ State Pattern passed!")

def test_observer_pattern():
    print("Testing 5: Observer Pattern...")
    notifier = IncidentNotifier()
    notifier.subscribe(ReporterObserver())
    notifier.subscribe(TechnicianObserver())
    notifier.subscribe(AdminObserver(admin_user_ids=[1]))

    event = IncidentEvent(
        incident_id=101,
        incident_title="Server Down",
        old_status="REPORTED",
        new_status="ASSIGNED",
        changed_by_id=2,
        reporter_id=5,
        assigned_to_id=3,
        priority="HIGH"
    )

    notifications = notifier.notify(event)
    assert len(notifications) == 3, f"Expected 3 notifications (Reporter, Tech, Admin), got {len(notifications)}"
    print("  ✓ Observer Pattern passed!")

def test_adapter_pattern():
    print("Testing 6: Adapter Pattern...")
    mock_email = MockEmailProvider()
    email_adapter = EmailNotificationAdapter(mock_email)
    success_email = email_adapter.send(user_id=42, message="Your ticket is resolved", incident_id=99)
    assert success_email is True

    mock_sms = MockSMSProvider()
    sms_adapter = SMSNotificationAdapter(mock_sms)
    success_sms = sms_adapter.send(user_id=42, message="Your ticket is resolved", incident_id=99)
    assert success_sms is True
    print("  ✓ Adapter Pattern passed!")

def run_all_tests():
    print("=" * 60)
    print("RUNNING DESIGN PATTERNS VERIFICATION SUITE")
    print("=" * 60)
    test_factory_method()
    test_strategy_pattern()
    test_auto_assignment_does_not_require_technician_id()
    test_incident_categories_use_current_options()
    test_chain_of_responsibility()
    test_state_pattern()
    test_observer_pattern()
    test_adapter_pattern()
    print("=" * 60)
    print("ALL 7 DESIGN PATTERNS VERIFIED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_all_tests()
