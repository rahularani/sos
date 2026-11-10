
import urllib.request
import json
import threading
import time

BASE_URL = "http://127.0.0.1:4000/api"

# Login
req = urllib.request.Request(
    f"{BASE_URL}/auth/admin/login",
    data=json.dumps({"email": "admin@uyra.org", "password": "UyraEmergency2026!"}).encode(),
    headers={"Content-Type": "application/json"}
)
with urllib.request.urlopen(req) as resp:
    token = json.loads(resp.read().decode())["accessToken"]

def post(path, data):
    r = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=json.dumps(data).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"}
    )
    with urllib.request.urlopen(r) as resp:
        return json.loads(resp.read().decode())

# 1. Create a single available team
team = post("/teams", {
    "name": f"Rescue Swift Squad {int(time.time())}",
    "category": "BUILDING_COLLAPSE",
    "latitude": 11.020,
    "longitude": 76.960
})

# 2. Create two competing incidents
inc1 = post("/incidents", {"category": "BUILDING_COLLAPSE", "latitude": 11.021, "longitude": 76.961})
inc2 = post("/incidents", {"category": "BUILDING_COLLAPSE", "latitude": 11.022, "longitude": 76.962})

print("Testing concurrent assignment race condition on single team...")
results = []
def assign_to(inc_id):
    try:
        res = post(f"/incidents/{inc_id}/assign", {"teamId": team["id"], "assignedBy": "Concurrent Dispatcher"})
        results.append(("SUCCESS", inc_id, res["assignment"]["id"]))
    except urllib.error.HTTPError as e:
        results.append(("CONFLICT_REJECTED", inc_id, e.code))

t1 = threading.Thread(target=assign_to, args=(inc1["referenceNumber"],))
t2 = threading.Thread(target=assign_to, args=(inc2["referenceNumber"],))

t1.start()
t2.start()
t1.join()
t2.join()

print("Race condition test results:")
for r in results:
    print(" ", r)

successes = [r for r in results if r[0] == "SUCCESS"]
conflicts = [r for r in results if r[0] == "CONFLICT_REJECTED"]

assert len(successes) == 1, "Exactly one assignment must succeed!"
assert len(conflicts) == 1, "The competing assignment must be rejected with 409 Conflict!"
assert conflicts[0][2] == 409, "Conflict code must be 409!"
print("✓ Concurrency protection verified! Database transaction prevented duplicate dispatch.")
