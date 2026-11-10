import re

admin_paths = [
    "/Users/rahulr/Desktop/zuvo/sos/admin-frontend/src/uyra_admin.tsx",
    "/Users/rahulr/Desktop/sos/admin-frontend/src/uyra_admin.tsx",
]

state_to_add = """
  // Phase 3 & 4: Intelligent Dispatch & Recommended Teams State
  const [recommendedTeams, setRecommendedTeams] = useState<any[]>([]);
  const [isLoadingRecommendedTeams, setIsLoadingRecommendedTeams] = useState(false);
  const [isAssigningTeam, setIsAssigningTeam] = useState(false);
  const [dispatchNote, setDispatchNote] = useState('');
  const [prioritizedIncidents, setPrioritizedIncidents] = useState<any[]>([]);
  const [isLoadingPrioritized, setIsLoadingPrioritized] = useState(false);
"""

fns_to_add = """
  // Fetch Prioritized Active Incident Queue (Phase 1 & 4)
  const fetchPrioritizedIncidents = async () => {
    setIsLoadingPrioritized(true);
    try {
      const res = await fetch(`${API_BASE_URL}/incidents/prioritized?limit=25`);
      if (res.ok) {
        const json = await res.json();
        setPrioritizedIncidents(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch prioritized incidents:', err);
    } finally {
      setIsLoadingPrioritized(false);
    }
  };

  // Fetch Recommended Response Teams (Phase 3)
  const fetchRecommendedTeams = async (incidentId: string) => {
    setIsLoadingRecommendedTeams(true);
    try {
      const res = await fetch(`${API_BASE_URL}/incidents/${incidentId}/recommended-teams`);
      if (res.ok) {
        const json = await res.json();
        setRecommendedTeams(json.data || []);
      } else {
        setRecommendedTeams([]);
      }
    } catch (err) {
      console.error('Failed to fetch recommended teams:', err);
      setRecommendedTeams([]);
    } finally {
      setIsLoadingRecommendedTeams(false);
    }
  };

  // Dispatch & Assign Team to Incident (Phase 3 & 4)
  const handleAssignTeam = async (incidentId: string, teamId: string) => {
    setIsAssigningTeam(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = authToken || localStorage.getItem('uyra_admin_token');
      if (token) headers['Authorization'] = 'Bearer ' + token;

      const res = await fetch(`${API_BASE_URL}/incidents/${incidentId}/assign`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          teamId,
          notes: dispatchNote.trim() || undefined,
          assignedBy: 'Admin Dispatcher',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Failed to dispatch team.');
        return;
      }

      pushToast('TEAM DISPATCHED', data.message, 'success');
      setDispatchNote('');
      fetchIncidents();
      fetchTeams();
      fetchRecommendedTeams(incidentId);
    } catch (err: any) {
      alert(err.message || 'Dispatch error occurred.');
    } finally {
      setIsAssigningTeam(false);
    }
  };
"""

for p in admin_paths:
    with open(p, "r", encoding="utf-8") as f:
        code = f.read()

    # Import GoogleMapsCanvas
    if "import { GoogleMapsCanvas } from './GoogleMapsCanvas';" not in code:
        code = code.replace("import { UyraBrand, InteractiveMapCanvas } from './uyra_shared';", "import { UyraBrand, InteractiveMapCanvas } from './uyra_shared';\nimport { GoogleMapsCanvas } from './GoogleMapsCanvas';")

    # Add state
    if "const [recommendedTeams," not in code:
        code = code.replace("const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);", "const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);\n" + state_to_add)

    # Add methods
    if "fetchRecommendedTeams =" not in code:
        code = code.replace("  // Teams API Integration (Phase 2)", fns_to_add + "\n  // Teams API Integration (Phase 2)")

    # When selected incident changes, load recommended teams
    if "fetchRecommendedTeams(selectedIncidentId);" not in code:
        old_sel_effect = """  useEffect(() => {
    if (selectedIncidentId) {
      // scroll to top or refresh
    }
  }, [selectedIncidentId]);"""
        new_sel_effect = """  useEffect(() => {
    if (selectedIncidentId) {
      fetchRecommendedTeams(selectedIncidentId);
    }
  }, [selectedIncidentId]);"""
        if old_sel_effect in code:
            code = code.replace(old_sel_effect, new_sel_effect)
        else:
            code = code.replace("  useEffect(() => {\n    fetchIncidents();", "  useEffect(() => {\n    if (selectedIncidentId) {\n      fetchRecommendedTeams(selectedIncidentId);\n    }\n  }, [selectedIncidentId]);\n\n  useEffect(() => {\n    fetchIncidents();")

    # Update lifecycle button statuses in details screen to include Assigned and Cancelled:
    # ['Pending', 'In Progress', 'Resolved'] -> ['Reported', 'Assigned', 'In Progress', 'Resolved', 'Cancelled']
    code = code.replace("['Pending', 'In Progress', 'Resolved'].map((st) => (", "['Reported', 'Assigned', 'In Progress', 'Resolved', 'Cancelled'].map((st) => (")

    with open(p, "w", encoding="utf-8") as f:
        f.write(code)
    print("Updated", p)
