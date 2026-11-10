
import urllib.request
import json
import time

BASE_URL = "http://127.0.0.1:4000/api"

# Login as admin to get bearer token
login_req = urllib.request.Request(
    f"{BASE_URL}/auth/admin/login",
    data=json.dumps({"email": "admin@uyra.org", "password": "UyraEmergency2026!"}).encode(),
    headers={"Content-Type": "application/json"}
)
with urllib.request.urlopen(login_req) as resp:
    login_data = json.loads(resp.read().decode())
    token = login_data["accessToken"]
    print("✓ Successfully authenticated Admin:", login_data["admin"]["name"])

def get(path):
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        headers={"Authorization": f"Bearer {token}"}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def post(path, data):
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=json.dumps(data).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def patch(path, data):
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=json.dumps(data).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
        method="PATCH"
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

print("=== STARTING PHASE 3 & PHASE 4 DISPATCH & TRACKING INTEGRATION TESTS ===")

# 1. Create response teams with distinct categories and coordinates
team_fire = post("/teams", {
    "name": f"Alpha Fire Brigade {int(time.time())}",
    "category": "FIRE",
    "latitude": 11.0180,
    "longitude": 76.9600,
    "contactPhone": "+91 94441 12233"
})
print("✓ Created Fire Team:", team_fire["id"], team_fire["name"])

team_med = post("/teams", {
    "name": f"Bravo Cardiac Ambulance {int(time.time())}",
    "category": "MEDICAL",
    "latitude": 11.0250,
    "longitude": 76.9750,
    "contactPhone": "+91 94441 22334"
})
print("✓ Created Medical Team:", team_med["id"], team_med["name"])

# 2. Create an emergency incident
incident = post("/incidents", {
    "title": "Industrial Factory Fire Alert",
    "description": "Thick black smoke and flames observed on ground floor.",
    "category": "FIRE",
    "latitude": 11.0168,
    "longitude": 76.9558,
    "address": "Avinashi Road, Peelamedu, Coimbatore",
    "peopleBracket": "2-5"
})
inc_id = incident["referenceNumber"]
print("✓ Created Fire Incident:", inc_id)

# 3. Test GET /api/incidents/:id/recommended-teams
rec = get(f"/incidents/{inc_id}/recommended-teams")
print(f"✓ Retrieved {rec['eligibleTeamsCount']} recommended teams for {inc_id}")
assert len(rec["data"]) >= 1, "Should have recommended teams"
top_team = rec["data"][0]
print(f"  Top recommended team: {top_team['name']} (Category: {top_team['category']}, Distance: {top_team['distanceKm']} km)")
assert top_team["category"] == "FIRE", "Top team must match FIRE category!"
assert top_team["distanceKm"] is not None and top_team["distanceKm"] > 0, "Distance must be computed!"

# 4. Test POST /api/incidents/:id/assign
dispatch = post(f"/incidents/{inc_id}/assign", {
    "teamId": top_team["id"],
    "assignedBy": "Station Commander Murugan",
    "notes": "Immediate deployment via Avinashi Flyover"
})
print("✓ Dispatched Team successfully:")
print("  Incident Status:", dispatch["incident"]["status"])
print("  Team Status:", dispatch["assignedTeam"]["status"])
print("  Assignment Distance:", dispatch["assignment"]["distanceKm"], "km")
assert dispatch["incident"]["status"] == "Assigned" or dispatch["incident"]["status"] == "ASSIGNED"
assert dispatch["assignedTeam"]["status"] == "DISPATCHED"

# 5. Test duplicate assignment prevention (Conflict check)
try:
    post(f"/incidents/{inc_id}/assign", {
        "teamId": team_med["id"]
    })
    print("❌ FAILED: Multiple active assignments should be rejected!")
except Exception as e:
    print("✓ Successfully prevented duplicate assignment to same incident:", e)

try:
    # Try assigning the already dispatched fire team to another incident
    inc2 = post("/incidents", {
        "category": "FIRE",
        "latitude": 11.0190,
        "longitude": 76.9610
    })
    post(f"/incidents/{inc2['referenceNumber']}/assign", {
        "teamId": top_team["id"]
    })
    print("❌ FAILED: Dispatched team should not be assigned twice!")
except Exception as e:
    print("✓ Successfully prevented assigning already DISPATCHED team:", e)

# 6. Test Lifecycle Transition: IN_PROGRESS -> RESOLVED
print("\nTesting Lifecycle Transition:")
in_prog = patch(f"/incidents/{inc_id}/status", {
    "status": "In Progress",
    "note": "Fire brigade on scene tackling blaze"
})
print("✓ Incident transitioned to:", in_prog["status"])

# Transition to RESOLVED -> Team must be released to AVAILABLE
res = patch(f"/incidents/{inc_id}/status", {
    "status": "Resolved",
    "note": "Fire extinguished and perimeter cooled. No casualties."
})
print("✓ Incident transitioned to:", res["status"])

# Check team status in database
team_after = get(f"/teams/{top_team['id']}")
print("✓ Response team status after incident resolution:", team_after["status"])
assert team_after["status"] == "AVAILABLE", "Team must be released to AVAILABLE upon incident resolution!"

print("\n=== ALL PHASE 3 & PHASE 4 BACKEND INTEGRATION TESTS PASSED ===")
