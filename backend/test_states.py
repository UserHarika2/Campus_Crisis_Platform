from app.states.incident_state import get_incident_state


# Valid transition
# state = get_incident_state("REPORTED")

# result = state.transition_to("ASSIGNED")

# print("Valid transition:", result)

state = get_incident_state("IN_PROGRESS")

result = state.transition_to("RESOLVED")

print("Valid transition:", result)

# Invalid transition
try:
    state.transition_to("CLOSED")
except ValueError as error:
    print("Invalid transition blocked:", error)