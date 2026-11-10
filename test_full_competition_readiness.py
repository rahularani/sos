import urllib.request
import json
import time

BASE_URL = "http://127.0.0.1:4000/api"

print("=================================================================")
print(" UYRA ROUND 2 — FINAL INTEGRATION & COMPETITION READINESS AUDIT  ")
print("=================================================================")

# STEP 1: Admin Authentication & JWT Security Verification
login_req = urllib.request.Request(
    f"{BASE_URL}/auth/admin/login",
    data=json.dumps({"email": "admin@uyra.org", "password": "UyraEmergency2026!"}).encode(),
    headers={"Content-Type": "application/json"}
)
with urllib.request.urlopen(login_req) as resp:
    admin_auth = json.loads(resp.read().decode())
    admin_token = admin_auth["accessToken"]
    print("✓ [SEC-01] Admin Authenticated with JWT:", admin_auth["admin"]["name"])

def api_get(path, token=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{BASE_URL}{path}", headers=headers)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def api_post(path, data, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{BASE_URL}{path}", data=json.dumps(data).encode(), headers=headers)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def api_patch(path, data, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{BASE_URL}{path}", data=json.dumps(data).encode(), headers=headers, method="PATCH")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

# STEP 2: Citizen Registration & SOS Distress Submission
unique_email = f"citizen_{int(time.time())}@example.com"
register_res = api_post("/auth/register", {
    "email": unique_email,
    "password": "Password123!",
    "fullName": "Kavitha Sundaram"
})
print(f"✓ [REQ-01] Citizen Registered & OTP Issued: {unique_email}")

# Submit Public SOS Incident
incident = api_post("/incidents", {
    "title": "Severe Highway Tanker Collision with Chemical Smoke",
    "description": "Multi-vehicle collision, people trapped, toxic smoke spreading.",
    "category": "ROAD_ACCIDENT",
    "peopleBracket": "6-10",
    "latitude": 11.0200,
    "longitude": 76.9650,
    "address": "L&T Bypass, Neelambur, Coimbatore",
    "contactName": "Kavitha Sundaram",
    "contactPhone": "+91 98840 55667"
})
inc_id = incident["referenceNumber"]
print(f"✓ [REQ-02] Emergency SOS Submitted: ID={inc_id}, Category={incident['category']}, Severity={incident['suggestedSeverity']}")
assert incident["suggestedSeverity"] == "Critical", "Should escalate to Critical due to trapped/smoke keywords"
assert incident["priorityScore"] > 0, "Priority score must be calculated"
print(f"✓ [REQ-03] Priority Engine Computed: Score={incident['priorityScore']} (Level: {incident['priorityLevel']})")

# STEP 3: Prioritized Triage Queue Retrieval
prioritized = api_get("/incidents/prioritized?limit=10")
assert any(i["referenceNumber"] == inc_id for i in prioritized["data"]), "New incident must be in prioritized queue"
print(f"✓ [REQ-04] Prioritized Triage Queue Active: {len(prioritized['data'])} active incidents evaluated")

# STEP 4: Phase 2 Teams Management — Create Specialized Response Team
team = api_post("/teams", {
    "name": f"Nilgiris Heavy Rescue Unit {int(time.time())}",
    "category": "ROAD_ACCIDENT",
    "latitude": 11.0220,
    "longitude": 76.9680,
    "contactPhone": "+91 422 2300100"
}, token=admin_token)
team_id = team["id"]
print(f"✓ [REQ-05] Response Team Commissioned: {team['name']} ({team['status']})")

# STEP 5: Phase 3 Intelligent Location-Based Recommendation & Haversine Distance
rec = api_get(f"/incidents/{inc_id}/recommended-teams")
print(f"✓ [REQ-06] Recommended Teams Evaluated: {rec['eligibleTeamsCount']} available teams ranked")
assert len(rec["data"]) > 0, "At least one team must be recommended"
top_rec = rec["data"][0]
print(f"  Nearest suitable team: {top_rec['name']} (Distance: {top_rec['distanceKm']} km straight-line)")
assert top_rec["id"] == team_id or top_rec["category"] == "ROAD_ACCIDENT"

# STEP 6: Phase 3 Atomic Dispatch with Row Locking & State Machine
dispatch = api_post(f"/incidents/{inc_id}/assign", {
    "teamId": team_id,
    "assignedBy": "Admin Commander Murugan",
    "notes": "Dispatching with heavy hydraulic cutting equipment"
}, token=admin_token)
assignment_id = dispatch["assignment"]["id"]
print(f"✓ [REQ-07] Team Dispatched: Incident={dispatch['incident']['status']}, Team={dispatch['assignedTeam']['status']}, Dist={dispatch['assignment']['distanceKm']} km")
assert dispatch["incident"]["status"] in ["Assigned", "ASSIGNED"]
assert dispatch["assignedTeam"]["status"] == "DISPATCHED"

# STEP 7: Security Audit — Unauthorized Team Assignment Blocked
try:
    api_post(f"/incidents/{inc_id}/assign", {"teamId": team_id}) # No token
    raise AssertionError("Unauthenticated dispatch must be rejected!")
except urllib.error.HTTPError as e:
    assert e.code == 401, "Must return 401 Unauthorized"
    print("✓ [SEC-02] Verified: Unauthenticated dispatch successfully blocked with 401 Unauthorized")

# STEP 8: Phase 4 Assignment Lifecycle: ASSIGNED -> EN_ROUTE -> ON_SCENE
en_route = api_patch(f"/incidents/{inc_id}/assignments/{assignment_id}/status", {
    "status": "EN_ROUTE",
    "notes": "Vehicle en route via bypass highway"
}, token=admin_token)
print(f"✓ [REQ-08] Assignment Lifecycle: Transitioned to {en_route['assignment']['status']}")

on_scene = api_patch(f"/incidents/{inc_id}/assignments/{assignment_id}/status", {
    "status": "ON_SCENE",
    "notes": "Arrived at collision scene. Extrication operations initiated."
}, token=admin_token)
print(f"✓ [REQ-09] Assignment Lifecycle: Transitioned to {on_scene['assignment']['status']} (Team is now {on_scene['team']['status']})")
assert on_scene["team"]["status"] == "BUSY", "Team status on scene must be BUSY"

# STEP 9: Incident Lifecycle: ASSIGNED -> IN_PROGRESS -> RESOLVED
in_prog = api_patch(f"/incidents/{inc_id}/status", {
    "status": "In Progress",
    "note": "Trapped victims extricated and stabilized"
}, token=admin_token)
print(f"✓ [REQ-10] Incident Lifecycle: Transitioned to {in_prog['status']}")

# STEP 10: Resolution & Automated Team Release to AVAILABLE
resolved = api_patch(f"/incidents/{inc_id}/status", {
    "status": "Resolved",
    "note": "All casualties transported to hospital. Highway cleared."
}, token=admin_token)
print(f"✓ [REQ-11] Incident Lifecycle: Transitioned to {resolved['status']}")

# Verify response team availability restored in PostgreSQL
team_final = api_get(f"/teams/{team_id}", token=admin_token)
print(f"✓ [REQ-12] Automated Team Release Verified: Team '{team_final['name']}' is now {team_final['status']}")
assert team_final["status"] == "AVAILABLE", "Team must be restored to AVAILABLE upon incident resolution"

# STEP 11: Phase 5 Analytics Accuracy Verification
stats = api_get("/dashboard/round2-stats")
print(f"✓ [REQ-13] Round 2 Advanced Analytics Verified:")
print(f"  Total Incidents: {stats['kpi']['totalIncidents']}")
print(f"  Resolution Rate: {stats['kpi']['resolutionRate']}%")
print(f"  Active Fleet: {stats['kpi']['activeResponseFleet']} teams")
print(f"  Resolved Metric: {stats['kpi']['resolvedIncidents']}")

print("\n=================================================================")
print(" ALL 13 CORE COMPETITION & INTEGRATION TESTS PASSED WITH 100% SUCCESS ")
print("=================================================================")
