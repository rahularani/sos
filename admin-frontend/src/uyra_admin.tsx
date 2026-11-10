import React, { useState, useEffect, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  LayoutDashboard,
  Radio,
  MapPin,
  Map as MapIcon,
  Search,
  Filter,
  Eye,
  Trash2,
  RefreshCw,
  Wifi,
  WifiOff,
  Bell,
  UserCheck,
  LogOut,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  Flame,
  ShieldCheck,
  Lock,
  PlusCircle,
  X,
  Sparkles,
  BarChart3,
  TrendingUp,
  Percent,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  UYRA_COLORS,
  EMERGENCY_CATEGORIES,
  API_BASE_URL,
  SOCKET_URL,
  UyraBrand,
  InteractiveMapCanvas,
} from './uyra_shared';
import { GoogleMapsCanvas } from './GoogleMapsCanvas';
import { LanguageSelector } from './LanguageSelector';
import { useTranslation } from 'react-i18next';

interface UyraAdminPortalProps {
  onSwitchToUser?: () => void;
}

export default function UyraAdminPortal({ onSwitchToUser }: UyraAdminPortalProps) {
  const { t } = useTranslation(['admin', 'common']);

  // Helper to localize category names across en, ta, hi, te, kn, ml
  const getLocalizedCategory = (cat: string | undefined | null) => {
    if (!cat) return '';
    const norm = cat.trim().toUpperCase().replace(/[\s-]/g, '_');
    if (norm === 'FIRE' || norm === 'FIRE_EMERGENCY') return t('admin:catFire', 'Fire Emergency');
    if (norm === 'ROAD_ACCIDENT' || norm === 'ROAD_ACCIDENT_EMERGENCY' || norm === 'TRAFFIC') return t('admin:catRoad', 'Road Accident');
    if (norm === 'MEDICAL' || norm === 'MEDICAL_EMERGENCY' || norm === 'AMBULANCE') return t('admin:catMedical', 'Medical Emergency');
    if (norm === 'FLOOD' || norm === 'FLOOD_EMERGENCY' || norm === 'DISASTER') return t('admin:catFlood', 'Flood');
    if (norm === 'BUILDING_COLLAPSE' || norm === 'COLLAPSE' || norm === 'RESCUE') return t('admin:catBuilding', 'Building Collapse');
    return t('admin:catOther', 'Other Emergencies');
  };
  // Authentication State
  const [authToken, setAuthToken] = useState<string | null>(
    localStorage.getItem('uyra_admin_token'),
  );
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(true);
  const [loginEmail, setLoginEmail] = useState('admin@uyra.org');
  const [loginPassword, setLoginPassword] = useState('UyraEmergency2026!');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Screen state: 'dashboard' | 'monitoring' | 'details' | 'map'
  const [adminScreen, setAdminScreen] = useState<'dashboard' | 'monitoring' | 'teams' | 'team_details' | 'analytics' | 'details' | 'map'>('dashboard');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  // Phase 3 & 4: Intelligent Dispatch & Recommended Teams State
  const [recommendedTeams, setRecommendedTeams] = useState<any[]>([]);
  const [isLoadingRecommendedTeams, setIsLoadingRecommendedTeams] = useState(false);
  const [isAssigningTeam, setIsAssigningTeam] = useState(false);
  const [dispatchNote, setDispatchNote] = useState('');
  const [prioritizedIncidents, setPrioritizedIncidents] = useState<any[]>([]);
  const [isLoadingPrioritized, setIsLoadingPrioritized] = useState(false);


  // Incidents and Dashboard State
  const [incidents, setIncidents] = useState<any[]>([]);
  const [isLoadingIncidents, setIsLoadingIncidents] = useState(false);
  const [stats, setStats] = useState<any>({
    total: 0,
    critical: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
  });

  // Socket.IO Real-Time State
  const [socketStatus, setSocketStatus] = useState<'connected' | 'reconnecting'>('reconnecting');
  const [socketRef, setSocketRef] = useState<Socket | null>(null);
  const [toastQueue, setToastQueue] = useState<any[]>([]);
  const [deleteConfirmIncident, setDeleteConfirmIncident] = useState<any | null>(null);

  // Round 2 Phase 5 Advanced Analytics State
  const [analyticsData, setAnalyticsData] = useState<any | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  // Teams State (Phase 2)
  const [teams, setTeams] = useState<any[]>([]);
  const [teamsMeta, setTeamsMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [teamsCounts, setTeamsCounts] = useState({ total: 0, available: 0, busy: 0, dispatched: 0, offDuty: 0 });
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);
  const [filterTeamCategory, setFilterTeamCategory] = useState('ALL');
  const [filterTeamStatus, setFilterTeamStatus] = useState('ALL');
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<any | null>(null);
  const [deleteConfirmTeam, setDeleteConfirmTeam] = useState<any | null>(null);
  const [teamFormName, setTeamFormName] = useState('');
  const [teamFormCategory, setTeamFormCategory] = useState('Medical Emergency');
  const [teamFormLat, setTeamFormLat] = useState('11.0168');
  const [teamFormLng, setTeamFormLng] = useState('76.9558');
  const [teamFormPhone, setTeamFormPhone] = useState('');
  const [teamFormNotes, setTeamFormNotes] = useState('');
  const [teamFormError, setTeamFormError] = useState('');
  const [isSubmittingTeam, setIsSubmittingTeam] = useState(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const pushToast = (title: string, message: string, type = 'emergency') => {
    const id = Date.now() + Math.random();
    setToastQueue((prev) => [{ id, title, message, type }, ...prev.slice(0, 3)]);
    setTimeout(() => {
      setToastQueue((prev) => prev.filter((t) => t.id !== id));
    }, 5500);
  };

  // Fetch Incidents from Backend
  const fetchIncidents = async () => {
    setIsLoadingIncidents(true);
    try {
      const res = await fetch(`${API_BASE_URL}/incidents?limit=100`);
      if (res.ok) {
        const json = await res.json();
        setIncidents(json.data || []);
        if (json.data && json.data.length > 0 && !selectedIncidentId) {
          setSelectedIncidentId(json.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch incidents:', err);
    } finally {
      setIsLoadingIncidents(false);
    }
  };

  // Fetch Dashboard Stats from Backend

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

  // Teams API Integration (Phase 2)
  const fetchTeams = async () => {
    setIsLoadingTeams(true);
    try {
      const params = new URLSearchParams();
      if (filterTeamCategory !== 'ALL') params.append('category', filterTeamCategory);
      if (filterTeamStatus !== 'ALL') params.append('status', filterTeamStatus);
      if (teamSearchQuery.trim()) params.append('search', teamSearchQuery.trim());
      params.append('limit', '50');

      const headers: Record<string, string> = {};
      const token = authToken || localStorage.getItem('uyra_admin_token');
      if (token) headers['Authorization'] = 'Bearer ' + token;

      const res = await fetch(`${API_BASE_URL}/teams?${params.toString()}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setTeams(data.teams || []);
        if (data.meta) setTeamsMeta(data.meta);
        if (data.counts) setTeamsCounts(data.counts);
      }
    } catch (err) {
      console.error('Failed to fetch response teams:', err);
    } finally {
      setIsLoadingTeams(false);
    }
  };

  const fetchTeamDetails = async (id: string) => {
    try {
      const headers: Record<string, string> = {};
      const token = authToken || localStorage.getItem('uyra_admin_token');
      if (token) headers['Authorization'] = 'Bearer ' + token;

      const res = await fetch(`${API_BASE_URL}/teams/${id}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSelectedTeam(data);
        setAdminScreen('team_details');
      }
    } catch (err) {
      console.error('Failed to fetch team details:', err);
    }
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeamFormError('');
    setIsSubmittingTeam(true);

    try {
      const token = authToken || localStorage.getItem('uyra_admin_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = 'Bearer ' + token;

      const payload = {
        name: teamFormName.trim(),
        category: teamFormCategory,
        latitude: parseFloat(teamFormLat),
        longitude: parseFloat(teamFormLng),
        contactPhone: teamFormPhone.trim() || undefined,
        notes: teamFormNotes.trim() || undefined,
      };

      const url = editingTeam ? `${API_BASE_URL}/teams/${editingTeam.id}` : `${API_BASE_URL}/teams`;
      const method = editingTeam ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to save response team.');
      }

      const savedTeam = await res.json();
      pushToast(
        editingTeam ? 'Team Details Updated' : 'Response Team Registered',
        `${savedTeam.name} (${savedTeam.categoryLabel || savedTeam.category})`,
        'info',
      );
      setIsCreateTeamOpen(false);
      setEditingTeam(null);
      fetchTeams();
    } catch (err: any) {
      setTeamFormError(err.message || 'Operation failed.');
    } finally {
      setIsSubmittingTeam(false);
    }
  };

  const handleUpdateTeamStatus = async (teamId: string, newStatus: string) => {
    try {
      const token = authToken || localStorage.getItem('uyra_admin_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = 'Bearer ' + token;

      const res = await fetch(`${API_BASE_URL}/teams/${teamId}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        alert(errJson.message || 'Failed to update team availability status.');
        return;
      }

      const updated = await res.json();
      pushToast('Team Status Changed', `${updated.name} is now ${updated.status}`, 'info');
      fetchTeams();
      if (selectedTeam && selectedTeam.id === teamId) {
        setSelectedTeam((prev: any) => ({ ...prev, status: updated.status }));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to change team status.');
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    try {
      const token = authToken || localStorage.getItem('uyra_admin_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = 'Bearer ' + token;

      const res = await fetch(`${API_BASE_URL}/teams/${teamId}`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        alert(errJson.message || 'Cannot delete response team.');
        return;
      }

      pushToast('Response Team Deleted', 'Team has been removed.', 'info');
      setDeleteConfirmTeam(null);
      if (selectedTeam && selectedTeam.id === teamId) {
        setSelectedTeam(null);
        setAdminScreen('teams');
      }
      fetchTeams();
    } catch (err: any) {
      alert(err.message || 'Failed to delete team.');
    }
  };

  const openCreateTeamModal = () => {
    setEditingTeam(null);
    setTeamFormName('');
    setTeamFormCategory('Medical Emergency');
    setTeamFormLat('11.0168');
    setTeamFormLng('76.9558');
    setTeamFormPhone('');
    setTeamFormNotes('');
    setTeamFormError('');
    setIsCreateTeamOpen(true);
  };

  const openEditTeamModal = (t: any) => {
    setEditingTeam(t);
    setTeamFormName(t.name);
    setTeamFormCategory(t.categoryLabel || t.category);
    setTeamFormLat(String(t.latitude));
    setTeamFormLng(String(t.longitude));
    setTeamFormPhone(t.contactPhone || '');
    setTeamFormNotes(t.notes || '');
    setTeamFormError('');
    setIsCreateTeamOpen(true);
  };

  // Fetch Advanced Analytics (Round 2 Phase 5)
  const fetchAnalytics = async () => {
    setIsLoadingAnalytics(true);
    try {
      const headers: Record<string, string> = {};
      const token = authToken || localStorage.getItem('uyra_admin_token');
      if (token) headers['Authorization'] = 'Bearer ' + token;

      const res = await fetch(`${API_BASE_URL}/dashboard/round2-stats`, { headers });
      if (res.ok) {
        const json = await res.json();
        setAnalyticsData(json);
      }
    } catch (err) {
      console.error('Failed to fetch advanced analytics:', err);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/dashboard/stats`);
      if (res.ok) {
        const json = await res.json();
        setStats(json);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    }
  };

  // --------------------------------------------------------------------------
  // Socket.IO Real-Time Connection
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (selectedIncidentId) {
      fetchRecommendedTeams(selectedIncidentId);
    }
  }, [selectedIncidentId]);

  // Auto-authenticate with default admin credentials if no valid token in localStorage
  useEffect(() => {
    const initAuth = async () => {
      const stored = localStorage.getItem('uyra_admin_token');
      if (!stored) {
        try {
          const res = await fetch(`${API_BASE_URL}/auth/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@uyra.org', password: 'UyraEmergency2026!' }),
          });
          if (res.ok) {
            const data = await res.json();
            localStorage.setItem('uyra_admin_token', data.accessToken);
            setAuthToken(data.accessToken);
            setIsAdminAuthenticated(true);
            fetchTeams();
          }
        } catch (e) {
          console.error('Failed auto-admin auth:', e);
        }
      }
    };
    initAuth();
  }, []);

  useEffect(() => {
    fetchIncidents();
    fetchStats();
    fetchTeams();
    fetchAnalytics();

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
    });

    socket.on('connect', () => {
      setSocketStatus('connected');
      console.log('Connected to UYRA Socket.IO server at', SOCKET_URL);
    });

    socket.on('disconnect', () => {
      setSocketStatus('reconnecting');
    });

    // Event: incident:created
    socket.on('incident:created', (newIncident: any) => {
      setIncidents((prev) => [newIncident, ...prev.filter((i) => i.id !== newIncident.id)]);
      setSelectedIncidentId(newIncident.id);
      fetchStats();
      fetchAnalytics();
      pushToast(
        `NEW INCIDENT DISPATCHED • ${newIncident.id}`,
        `${newIncident.title} (${newIncident.confirmedSeverity || newIncident.suggestedSeverity})`,
        'emergency',
      );
    });

    // Event: incident:status_changed
    socket.on('incident:status_changed', (payload: any) => {
      const updated = payload.incident;
      setIncidents((prev) =>
        prev.map((i) => (i.id === updated.id || i.referenceNumber === updated.referenceNumber ? updated : i)),
      );
      fetchStats();
      fetchAnalytics();
      pushToast(
        `STATUS UPDATED • ${updated.id}`,
        `Transitioned to ${payload.newStatus}`,
        'info',
      );
    });

    // Event: incident:updated (e.g. severity override)
    socket.on('incident:updated', (updated: any) => {
      setIncidents((prev) =>
        prev.map((i) => (i.id === updated.id || i.referenceNumber === updated.referenceNumber ? updated : i)),
      );
      fetchStats();
      pushToast(
        `INCIDENT OVERRIDE • ${updated.id}`,
        `Severity confirmed as ${updated.confirmedSeverity}`,
        'info',
      );
    });

    // Event: incident:deleted
    socket.on('incident:deleted', (payload: { id: string }) => {
      setIncidents((prev) => prev.filter((i) => i.id !== payload.id && i.referenceNumber !== payload.id));
      fetchStats();
      fetchAnalytics();
      pushToast(`INCIDENT REMOVED`, `Incident ${payload.id} deleted.`, 'info');
    });

    // Event: dashboard:stats_updated
    socket.on('dashboard:stats_updated', (updatedStats: any) => {
      setStats(updatedStats);
    });

    // Team Real-Time Socket.IO Listeners (Phase 2)
    socket.on('team:created', (newTeam: any) => {
      setTeams((prev) => [newTeam, ...prev.filter((t) => t.id !== newTeam.id)]);
      fetchTeams();
      fetchAnalytics();
      pushToast('NEW RESPONSE TEAM', `${newTeam.name} registered.`, 'info');
    });

    socket.on('team:updated', (updatedTeam: any) => {
      setTeams((prev) => prev.map((t) => (t.id === updatedTeam.id ? updatedTeam : t)));
      if (selectedTeam && selectedTeam.id === updatedTeam.id) {
        setSelectedTeam(updatedTeam);
      }
      fetchTeams();
    });

    socket.on('team:status_changed', (payload: any) => {
      setTeams((prev) =>
        prev.map((t) => (t.id === payload.team.id ? { ...t, status: payload.newStatus } : t)),
      );
      fetchAnalytics();
      if (selectedTeam && selectedTeam.id === payload.team.id) {
        setSelectedTeam((prev: any) => ({ ...prev, status: payload.newStatus }));
      }
      fetchTeams();
      pushToast(
        'TEAM STATUS UPDATE',
        `${payload.team.name} is now ${payload.newStatus}`,
        'info',
      );
    });

    
    // Parallel Lifecycle Events (Agent A integration)
    socket.on('incident:assigned', () => {
      fetchIncidents();
      fetchTeams();
      fetchAnalytics();
    });

    socket.on('assignment:completed', () => {
      fetchIncidents();
      fetchTeams();
      fetchAnalytics();
    });
    socket.on('team:deleted', (payload: { id: string }) => {
      setTeams((prev) => prev.filter((t) => t.id !== payload.id));
      fetchAnalytics();
      if (selectedTeam && selectedTeam.id === payload.id) {
        setSelectedTeam(null);
        setAdminScreen('teams');
      }
      fetchTeams();
    });

    setSocketRef(socket);

    return () => {
      socket.disconnect();
    };
  }, []);

  // Handle Admin Login
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const res = await fetch(`${API_BASE_URL}/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      if (!res.ok) {
        throw new Error('Invalid email or password.');
      }

      const data = await res.json();
      localStorage.setItem('uyra_admin_token', data.accessToken);
      setAuthToken(data.accessToken);
      setIsAdminAuthenticated(true);
      setAdminScreen('dashboard');
      pushToast('Authentication Verified', 'Welcome back Commander.', 'success');
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('uyra_admin_token');
    setAuthToken(null);
    setIsAdminAuthenticated(false);
  };

  // Status transition action
  const handleUpdateStatus = async (incidentId: string, newStatus: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/incidents/${incidentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          status: newStatus,
          updatedBy: 'Admin Commander (Authenticated)',
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setIncidents((prev) => prev.map((i) => (i.id === incidentId ? updated : i)));
        fetchStats();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Severity override action
  const handleOverrideSeverity = async (incidentId: string, newSeverity: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/incidents/${incidentId}/severity`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          severity: newSeverity,
          updatedBy: 'Admin Commander (Authenticated)',
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setIncidents((prev) => prev.map((i) => (i.id === incidentId ? updated : i)));
        fetchStats();
      }
    } catch (err) {
      console.error('Failed to override severity:', err);
    }
  };

  // Remove incident
  const handleRemoveIncident = async (incidentId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/incidents/${incidentId}`, {
        method: 'DELETE',
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      });

      if (res.ok) {
        setIncidents((prev) => prev.filter((i) => i.id !== incidentId));
        setDeleteConfirmIncident(null);
        if (selectedIncidentId === incidentId) {
          setSelectedIncidentId(null);
        }
        fetchStats();
      }
    } catch (err) {
      console.error('Failed to remove incident:', err);
    }
  };

  // Trigger test emergency to test full end-to-end flow!
  const triggerSimulatedSOS = async () => {
    const templates = [
      {
        title: 'Transformer Fire with Arcing Wires in Peedampalli',
        description: 'Electrical transformer sparking with fire spreading to nearby trees. Loud crackling.',
        category: 'Fire Emergency',
        peopleBracket: '2-5',
        address: 'Peedampalli Junction, Coimbatore',
        latitude: 11.002,
        longitude: 77.012,
      },
      {
        title: 'Four-Vehicle Collision on Avinashi Flyover',
        description: 'Multiple cars collision. Bystanders reporting two passengers unconscious inside car.',
        category: 'Road Accident',
        peopleBracket: '6-10',
        address: 'Avinashi Road Flyover, Coimbatore',
        latitude: 11.025,
        longitude: 76.965,
      },
      {
        title: 'Severe Cardiac Distress at Gandhipuram Bus Station',
        description: 'Elderly passenger collapsed unconscious near platform 3, CPR required.',
        category: 'Medical Emergency',
        peopleBracket: '1',
        address: 'Gandhipuram Central Bus Stand, Coimbatore',
        latitude: 11.018,
        longitude: 76.968,
      },
    ];

    const pick = templates[Math.floor(Math.random() * templates.length)];
    try {
      await fetch(`${API_BASE_URL}/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pick),
      });
    } catch (err) {
      console.error('Failed to trigger simulation:', err);
    }
  };

  // Filtered Incidents List
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      if (filterCategory !== 'ALL' && inc.category !== filterCategory) return false;
      if (filterSeverity !== 'ALL' && inc.confirmedSeverity !== filterSeverity) return false;
      if (filterStatus !== 'ALL' && inc.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          (inc.title || '').toLowerCase().includes(q) ||
          (inc.id || '').toLowerCase().includes(q) ||
          (inc.address || '').toLowerCase().includes(q) ||
          (inc.description || '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [incidents, filterCategory, filterSeverity, filterStatus, searchQuery]);

  const selectedIncident = useMemo(() => {
    return incidents.find((i) => i.id === selectedIncidentId) || incidents[0] || null;
  }, [incidents, selectedIncidentId]);

  // Derived KPI values
  const kpiTotal = stats.total ?? incidents.length;
  const kpiCritical =
    stats.critical ?? incidents.filter((i) => i.confirmedSeverity === 'Critical').length;
  const kpiPending =
    stats.pending ?? incidents.filter((i) => i.status === 'Pending').length;
  const kpiInProgress =
    stats.inProgress ?? incidents.filter((i) => i.status === 'In Progress').length;
  const kpiResolved =
    stats.resolved ?? incidents.filter((i) => i.status === 'Resolved').length;

  // Chart data
  const categoryChartData = useMemo(() => {
    if (stats.categoryDistribution) return stats.categoryDistribution;
    const map: Record<string, number> = {};
    incidents.forEach((i) => {
      map[i.category] = (map[i.category] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [stats, incidents]);

  const severityChartData = useMemo(() => {
    if (stats.severityDistribution) return stats.severityDistribution;
    const map: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    incidents.forEach((i) => {
      const sev = i.confirmedSeverity || 'Low';
      map[sev] = (map[sev] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [stats, incidents]);

  const SEVERITY_COLORS: Record<string, string> = {
    Critical: '#DC2626',
    High: '#F97316',
    Medium: '#EAB308',
    Low: '#16A34A',
  };

  // --------------------------------------------------------------------------
  // LOGIN SCREEN (If unauthenticated)
  // --------------------------------------------------------------------------
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen d-flex align-items-center justify-content-center bg-light p-3">
        <div className="card rounded-4 border-0 shadow-lg p-4 w-100" style={{ maxWidth: 420 }}>
          <div className="text-center mb-4">
            <div className="d-inline-block mb-3">
              <UyraBrand size="lg" />
            </div>
            <h4 className="fw-black text-dark mb-1">Administrator Sign-In</h4>
            <p className="text-secondary small mb-0">Authorized Command Center Access Only</p>
          </div>

          {loginError && (
            <div className="alert alert-danger py-2 px-3 small rounded-3 mb-3">
              {loginError}
            </div>
          )}

          <form onSubmit={handleAdminLogin}>
            <div className="mb-3">
              <label className="form-label small fw-bold text-dark">Email Address</label>
              <input
                type="email"
                className="form-control rounded-3"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
              />
            </div>
            <div className="mb-4">
              <label className="form-label small fw-bold text-dark">Password</label>
              <input
                type="password"
                className="form-control rounded-3"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoggingIn}
              className="btn btn-dark w-100 py-2 rounded-pill fw-bold d-flex align-items-center justify-content-center gap-2"
              style={{ backgroundColor: UYRA_COLORS.deepNavy }}
            >
              {isLoggingIn ? <span className="spinner-border spinner-border-sm" /> : <Lock size={16} />}
              <span>Sign In to Dashboard</span>
            </button>
          </form>

          {onSwitchToUser && (
            <div className="text-center mt-3 pt-3 border-top">
              <button
                type="button"
                onClick={onSwitchToUser}
                className="btn btn-link text-danger text-decoration-none small fw-semibold"
              >
                ← Return to Public SOS Portal
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light">
      {/* ------------------------------------------------------------------ */}
      {/* ADMIN HEADER                                                       */}
      {/* ------------------------------------------------------------------ */}
      <header
        className="navbar navbar-dark sticky-top px-3 py-2 shadow-sm"
        style={{ backgroundColor: UYRA_COLORS.deepNavy, zIndex: 1040 }}
      >
        <div className="container-fluid d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            <UyraBrand dark size="md" />
            <span className="badge bg-secondary text-uppercase fw-bold d-none d-md-inline" style={{ fontSize: '0.65rem' }}>
              Admin Command Center
            </span>
          </div>

          <div className="d-flex align-items-center gap-2">
            {/* Live Socket.IO Status Indicator */}
            <div
              className="badge px-3 py-2 rounded-pill d-flex align-items-center gap-2 border"
              style={{
                backgroundColor: socketStatus === 'connected' ? '#064E3B' : '#78350F',
                borderColor: socketStatus === 'connected' ? '#10B981' : '#F59E0B',
                color: '#FFFFFF',
              }}
            >
              {socketStatus === 'connected' ? (
                <Wifi size={13} className="text-success" />
              ) : (
                <RefreshCw size={13} className="spinner-border spinner-border-sm" />
              )}
              <span style={{ fontSize: '0.72rem' }}>
                Socket.IO: {socketStatus === 'connected' ? 'Live Stream' : 'Reconnecting...'}
              </span>
            </div>

            {/* Test Simulation Button */}
            <button
              type="button"
              onClick={triggerSimulatedSOS}
              className="btn btn-outline-light btn-sm rounded-pill px-3 py-1 fw-bold d-flex align-items-center gap-1"
              title="Trigger simulated SOS to verify real-time Socket.IO ingestion"
            >
              <Radio size={13} className="text-danger" />
              <span className="d-none d-sm-inline">+ Test SOS</span>
            </button>

            {/* Switch to Public SOS */}
            {onSwitchToUser && (
              <button
                type="button"
                onClick={onSwitchToUser}
                className="btn btn-outline-light btn-sm rounded-pill px-3 py-1 fw-semibold"
              >
                Public Portal
              </button>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="btn btn-outline-danger btn-sm rounded-circle p-1 ms-1"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* ADMIN NAVIGATION SUBNAV                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white border-bottom px-3 py-2 shadow-xs sticky-top" style={{ top: 56, zIndex: 1030 }}>
        <div className="container-fluid d-flex align-items-center justify-content-between overflow-auto">
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              onClick={() => setAdminScreen('dashboard')}
              className={`btn btn-sm rounded-pill px-3 fw-semibold d-flex align-items-center gap-2 ${
                adminScreen === 'dashboard' ? 'btn-danger text-white' : 'btn-light'
              }`}
            >
              <LayoutDashboard size={14} />
              <span>KPI Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => setAdminScreen('monitoring')}
              className={`btn btn-sm rounded-pill px-3 fw-semibold d-flex align-items-center gap-2 ${
                adminScreen === 'monitoring' ? 'btn-danger text-white' : 'btn-light'
              }`}
            >
              <Activity size={14} />
              <span>Incident Monitor ({incidents.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setAdminScreen('map')}
              className={`btn btn-sm rounded-pill px-3 fw-semibold d-flex align-items-center gap-2 ${
                adminScreen === 'map' ? 'btn-danger text-white' : 'btn-light'
              }`}
            >
              <MapIcon size={14} />
              <span>Geospatial Map</span>
            </button>

            {selectedIncident && (
              <button
                type="button"
                onClick={() => setAdminScreen('details')}
                className={`btn btn-sm rounded-pill px-3 fw-semibold d-flex align-items-center gap-2 ${
                  adminScreen === 'details' ? 'btn-danger text-white' : 'btn-light'
                }`}
              >
                <Eye size={14} />
                <span>Details ({selectedIncident.id})</span>
              </button>
            )}
          </div>

          <div className="d-none d-md-flex align-items-center gap-2 text-muted small">
            <Clock size={12} />
            <span>Real-time Sync Active</span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* TAB 1: KPI DASHBOARD                                               */}
      {/* ------------------------------------------------------------------ */}
      {adminScreen === 'dashboard' && (
        <div className="container-fluid py-4 px-3 px-md-4">
          {/* KPI Metrics Cards */}
          <div className="row g-3 mb-4">
            <div className="col-6 col-md">
              <div className="card rounded-4 border-0 shadow-sm p-3 bg-white h-100">
                <span className="text-secondary small fw-semibold text-uppercase">Total Incidents</span>
                <div className="fs-2 fw-black text-dark mt-1" style={{ fontWeight: 900 }}>
                  {kpiTotal}
                </div>
                <div className="small text-muted mt-auto pt-1">All recorded SOS reports</div>
              </div>
            </div>

            <div className="col-6 col-md">
              <div
                className="card rounded-4 border-0 shadow-sm p-3 h-100"
                style={{ backgroundColor: '#FEE2E2', borderLeft: '4px solid #DC2626' }}
              >
                <span className="text-danger small fw-bold text-uppercase">Critical Severity</span>
                <div className="fs-2 fw-black text-danger mt-1" style={{ fontWeight: 900 }}>
                  {kpiCritical}
                </div>
                <div className="small text-danger opacity-75 mt-auto pt-1">Immediate priority</div>
              </div>
            </div>

            <div className="col-6 col-md">
              <div
                className="card rounded-4 border-0 shadow-sm p-3 h-100"
                style={{ backgroundColor: '#FEF3C7', borderLeft: '4px solid #F59E0B' }}
              >
                <span className="text-warning small fw-bold text-uppercase" style={{ color: '#92400E' }}>
                  Pending Dispatch
                </span>
                <div className="fs-2 fw-black text-dark mt-1" style={{ fontWeight: 900 }}>
                  {kpiPending}
                </div>
                <div className="small text-muted mt-auto pt-1">Awaiting triage/verification</div>
              </div>
            </div>

            <div className="col-6 col-md">
              <div
                className="card rounded-4 border-0 shadow-sm p-3 h-100"
                style={{ backgroundColor: '#E0E7FF', borderLeft: '4px solid #6366F1' }}
              >
                <span className="text-primary small fw-bold text-uppercase" style={{ color: '#3730A3' }}>
                  In Progress
                </span>
                <div className="fs-2 fw-black text-dark mt-1" style={{ fontWeight: 900 }}>
                  {kpiInProgress}
                </div>
                <div className="small text-muted mt-auto pt-1">Responders actively deployed</div>
              </div>
            </div>

            <div className="col-6 col-md">
              <div
                className="card rounded-4 border-0 shadow-sm p-3 h-100"
                style={{ backgroundColor: '#DCFCE7', borderLeft: '4px solid #16A34A' }}
              >
                <span className="text-success small fw-bold text-uppercase">Resolved</span>
                <div className="fs-2 fw-black text-success mt-1" style={{ fontWeight: 900 }}>
                  {kpiResolved}
                </div>
                <div className="small text-success opacity-75 mt-auto pt-1">Cleared & secured</div>
              </div>
            </div>
          </div>

          {/* Visual Analytics Charts */}
          <div className="row g-3 mb-4">
            <div className="col-12 col-lg-8">
              <div className="card rounded-4 border-0 shadow-sm p-3 bg-white h-100">
                <h6 className="fw-bold text-dark mb-3">Incidents by Emergency Category</h6>
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} />
                      <RechartsTooltip />
                      <Bar dataKey="count" fill={UYRA_COLORS.primaryRed} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-4">
              <div className="card rounded-4 border-0 shadow-sm p-3 bg-white h-100">
                <h6 className="fw-bold text-dark mb-3">Severity Breakdown</h6>
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={severityChartData}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(e) => `${e.name}: ${e.count}`}
                      >
                        {severityChartData.map((entry: any) => (
                          <Cell
                            key={`cell-${entry.name}`}
                            fill={SEVERITY_COLORS[entry.name] || '#94A3B8'}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Active Incidents Table */}
          <div className="card rounded-4 border-0 shadow-sm p-3 bg-white">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h6 className="fw-bold text-dark mb-0">Latest Emergency Reports</h6>
              <button
                type="button"
                onClick={() => setAdminScreen('monitoring')}
                className="btn btn-outline-dark btn-sm rounded-pill px-3"
              >
                View Full Monitor Table →
              </button>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                <thead className="table-light">
                  <tr>
                    <th>Ref ID</th>
                    <th>Incident</th>
                    <th>Category</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Address</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.slice(0, 5).map((inc) => (
                    <tr key={inc.id}>
                      <td className="fw-bold text-dark font-monospace">{inc.id}</td>
                      <td className="fw-semibold text-truncate" style={{ maxWidth: 260 }}>
                        {inc.title}
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border">{inc.category}</span>
                      </td>
                      <td>
                        <span
                          className="badge rounded-pill fw-bold"
                          style={{
                            backgroundColor:
                              inc.confirmedSeverity === 'Critical'
                                ? '#FEE2E2'
                                : inc.confirmedSeverity === 'High'
                                ? '#FFEDD5'
                                : inc.confirmedSeverity === 'Medium'
                                ? '#FEF9C3'
                                : '#DCFCE7',
                            color:
                              inc.confirmedSeverity === 'Critical'
                                ? '#B91C1C'
                                : inc.confirmedSeverity === 'High'
                                ? '#C2410C'
                                : inc.confirmedSeverity === 'Medium'
                                ? '#A16207'
                                : '#15803D',
                          }}
                        >
                          {inc.confirmedSeverity || inc.suggestedSeverity}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-secondary">{inc.status}</span>
                      </td>
                      <td className="text-muted text-truncate" style={{ maxWidth: 200 }}>
                        {inc.address}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedIncidentId(inc.id);
                            setAdminScreen('details');
                          }}
                          className="btn btn-sm btn-light border rounded-pill px-2 py-1"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB 2: LIVE INCIDENT MONITORING                                    */}
      {/* ------------------------------------------------------------------ */}
      {adminScreen === 'monitoring' && (
        <div className="container-fluid py-4 px-3 px-md-4">
          <div className="card rounded-4 border-0 shadow-sm p-3 bg-white mb-3">
            {/* Filter Bar */}
            <div className="row g-2 align-items-center">
              <div className="col-12 col-md-4">
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-light border-end-0">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="Search by ID, title, address, description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="col-6 col-md-2">
                <select
                  className="form-select form-select-sm"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="ALL">All Categories</option>
                  {EMERGENCY_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-6 col-md-2">
                <select
                  className="form-select form-select-sm"
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                >
                  <option value="ALL">All Severities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div className="col-6 col-md-2">
                <select
                  className="form-select form-select-sm"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Reported">Reported</option>
                </select>
              </div>

              <div className="col-6 col-md-2 text-end">
                <button
                  type="button"
                  onClick={fetchIncidents}
                  className="btn btn-outline-secondary btn-sm rounded-pill w-100"
                >
                  <RefreshCw size={12} className="me-1" />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Incidents Table */}
          <div className="card rounded-4 border-0 shadow-sm bg-white overflow-hidden">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.82rem' }}>
                <thead className="table-dark">
                  <tr>
                    <th>Ref ID</th>
                    <th>Title & Hazard Details</th>
                    <th>Category</th>
                    <th>Location</th>
                    <th>Suggested</th>
                    <th>Confirmed</th>
                    <th>Status</th>
                    <th>Reported</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIncidents.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-4 text-muted">
                        No incidents match current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredIncidents.map((inc) => (
                      <tr key={inc.id}>
                        <td className="fw-bold font-monospace text-dark">{inc.id}</td>
                        <td style={{ maxWidth: 320 }}>
                          <div className="fw-bold text-dark text-truncate">{inc.title}</div>
                          <div className="text-secondary small text-truncate" style={{ fontSize: '0.74rem' }}>
                            {inc.description}
                          </div>
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border">{inc.category}</span>
                        </td>
                        <td className="text-truncate" style={{ maxWidth: 180 }}>
                          <MapPin size={11} className="text-danger me-1" />
                          <span>{inc.address}</span>
                        </td>
                        <td>
                          <span className="badge bg-light text-secondary border">
                            {inc.suggestedSeverity}
                          </span>
                        </td>
                        <td>
                          <span
                            className="badge rounded-pill fw-bold"
                            style={{
                              backgroundColor:
                                inc.confirmedSeverity === 'Critical'
                                  ? '#FEE2E2'
                                  : inc.confirmedSeverity === 'High'
                                  ? '#FFEDD5'
                                  : inc.confirmedSeverity === 'Medium'
                                  ? '#FEF9C3'
                                  : '#DCFCE7',
                              color:
                                inc.confirmedSeverity === 'Critical'
                                  ? '#B91C1C'
                                  : inc.confirmedSeverity === 'High'
                                  ? '#C2410C'
                                  : inc.confirmedSeverity === 'Medium'
                                  ? '#A16207'
                                  : '#15803D',
                            }}
                          >
                            {inc.confirmedSeverity}
                          </span>
                        </td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              backgroundColor:
                                inc.status === 'Resolved'
                                  ? '#DCFCE7'
                                  : inc.status === 'In Progress'
                                  ? '#E0E7FF'
                                  : '#FEF3C7',
                              color:
                                inc.status === 'Resolved'
                                  ? '#166534'
                                  : inc.status === 'In Progress'
                                  ? '#3730A3'
                                  : '#92400E',
                            }}
                          >
                            {inc.status}
                          </span>
                        </td>
                        <td className="text-muted text-nowrap" style={{ fontSize: '0.74rem' }}>
                          {new Date(inc.reportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="text-end">
                          <div className="btn-group btn-group-sm">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedIncidentId(inc.id);
                                setAdminScreen('details');
                              }}
                              className="btn btn-outline-primary"
                              title="Inspect Details"
                            >
                              <Eye size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmIncident(inc)}
                              className="btn btn-outline-danger"
                              title="Delete Incident"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB 3: INCIDENT DETAILS & LIFECYCLE MANAGEMENT                    */}
      {/* ------------------------------------------------------------------ */}
      {adminScreen === 'details' && selectedIncident && (
        <div className="container-fluid py-4 px-3 px-md-4">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <button
              type="button"
              onClick={() => setAdminScreen('monitoring')}
              className="btn btn-light border rounded-pill px-3 py-1 btn-sm fw-semibold"
            >
              ← Back to Monitor Table
            </button>
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-dark font-monospace px-3 py-2">
                INCIDENT ID: {selectedIncident.id}
              </span>
              <button
                type="button"
                onClick={() => setDeleteConfirmIncident(selectedIncident)}
                className="btn btn-outline-danger btn-sm rounded-pill"
              >
                <Trash2 size={13} className="me-1" />
                Remove Incident
              </button>
            </div>
          </div>

          <div className="row g-3">
            {/* Left Column: Details & Actions */}
            <div className="col-12 col-lg-7">
              <div className="card rounded-4 border-0 shadow-sm p-4 bg-white mb-3">
                <div className="d-flex align-items-start justify-content-between mb-3">
                  <div>
                    <span className="badge bg-danger mb-2">{selectedIncident.category}</span>
                    <h4 className="fw-black text-dark mb-1">{selectedIncident.title}</h4>
                    <div className="text-secondary small">
                      Reported: {new Date(selectedIncident.reportedAt).toLocaleString()}
                    </div>
                  </div>
                  <span
                    className="badge rounded-pill fs-6 px-3 py-2 fw-bold"
                    style={{
                      backgroundColor:
                        selectedIncident.confirmedSeverity === 'Critical'
                          ? '#FEE2E2'
                          : selectedIncident.confirmedSeverity === 'High'
                          ? '#FFEDD5'
                          : selectedIncident.confirmedSeverity === 'Medium'
                          ? '#FEF9C3'
                          : '#DCFCE7',
                      color:
                        selectedIncident.confirmedSeverity === 'Critical'
                          ? '#B91C1C'
                          : selectedIncident.confirmedSeverity === 'High'
                          ? '#C2410C'
                          : selectedIncident.confirmedSeverity === 'Medium'
                          ? '#A16207'
                          : '#15803D',
                    }}
                  >
                    {selectedIncident.confirmedSeverity}
                  </span>
                </div>

                <div className="p-3 rounded-3 bg-light border mb-4">
                  <div className="fw-bold small text-dark mb-1">Hazard Description:</div>
                  <p className="mb-0 text-dark small" style={{ whiteSpace: 'pre-wrap' }}>
                    {selectedIncident.description}
                  </p>
                </div>

                
                {/* PHASE 3 & 4: INTELLIGENT LOCATION-BASED DISPATCH PANEL */}
                <div className="mb-4 p-3 rounded-4 border bg-white shadow-xs">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <div className="d-flex align-items-center gap-2">
                      <Radio size={18} className="text-danger" />
                      <h6 className="fw-bold text-dark mb-0">{t('admin:dispatchTitle', 'Location-Based Smart Dispatch (Phase 3)')}</h6>
                    </div>
                    {selectedIncident.activeAssignment ? (
                      <span className="badge bg-primary px-3 py-2 rounded-pill fw-bold">
                        ACTIVE DISPATCH: {selectedIncident.activeAssignment.team?.name || 'Assigned'}
                      </span>
                    ) : (
                      <span className="badge bg-warning text-dark px-3 py-2 rounded-pill fw-bold">
                        AWAITING RESPONSE TEAM
                      </span>
                    )}
                  </div>

                  {/* Active Assignment Card if Dispatched */}
                  {selectedIncident.activeAssignment ? (
                    <div className="p-3 rounded-3 bg-primary bg-opacity-10 border border-primary mb-3">
                      <div className="d-flex align-items-center justify-content-between">
                        <div>
                          <div className="text-primary small fw-bold text-uppercase">{t('admin:assignedTeamLabel', 'Currently Assigned Response Team:')}</div>
                          <div className="fw-black fs-5 text-dark mt-1">
                            {selectedIncident.activeAssignment.team?.name}
                          </div>
                          <div className="small text-secondary mt-1">
                            Category: <strong>{getLocalizedCategory(selectedIncident.activeAssignment.team?.category)}</strong> | Status: <span className="badge bg-primary">{selectedIncident.activeAssignment.team?.status}</span>
                          </div>
                          {selectedIncident.activeAssignment.team?.contactPhone && (
                            <div className="small text-secondary mt-1">
                              {t('admin:contactPhoneLabel', 'Contact Line')}: <a href={`tel:${selectedIncident.activeAssignment.team.contactPhone}`} className="text-primary fw-bold">{selectedIncident.activeAssignment.team.contactPhone}</a>
                            </div>
                          )}
                          <div className="small text-muted mt-2">
                            Dispatched At: {new Date(selectedIncident.activeAssignment.assignedAt).toLocaleString()} by {selectedIncident.activeAssignment.assignedBy}
                          </div>
                        </div>
                        <div className="text-end">
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(selectedIncident.id, 'Resolved')}
                            className="btn btn-success btn-sm rounded-pill px-3 fw-bold shadow-sm"
                          >
                            Mark Resolved & Release Team
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="small fw-bold text-secondary text-uppercase">
                          {t('admin:recommendTeams', 'Recommended Response Teams')} (Ranked by Category & Haversine Distance):
                        </span>
                        <button
                          type="button"
                          onClick={() => fetchRecommendedTeams(selectedIncident.id)}
                          className="btn btn-outline-secondary btn-sm py-0 px-2 rounded-pill"
                          style={{ fontSize: '0.72rem' }}
                        >
                          <RefreshCw size={10} className="me-1" />
                          Refresh List
                        </button>
                      </div>

                      {isLoadingRecommendedTeams ? (
                        <div className="text-center py-3 text-muted small">
                          <span className="spinner-border spinner-border-sm me-2" />
                          Evaluating nearest compatible response teams...
                        </div>
                      ) : recommendedTeams.length === 0 ? (
                        <div className="alert alert-light border small text-muted mb-0">
                          {t('admin:noEligibleTeams', 'No AVAILABLE response teams currently within category or sector.')}
                        </div>
                      ) : (
                        <div className="d-flex flex-column gap-2">
                          {recommendedTeams.map((recTeam: any, index: number) => (
                            <div
                              key={recTeam.id}
                              className={`p-3 rounded-3 border d-flex align-items-center justify-content-between transition-all ${
                                index === 0 ? 'border-primary bg-light' : 'bg-white'
                              }`}
                            >
                              <div>
                                <div className="d-flex align-items-center gap-2">
                                  <span className="fw-bold text-dark">{recTeam.name}</span>
                                  {index === 0 && (
                                    <span className="badge bg-primary text-white small" style={{ fontSize: '0.65rem' }}>
                                      BEST FIT
                                    </span>
                                  )}
                                  <span className="badge bg-light text-secondary border small">
                                    {getLocalizedCategory(recTeam.category)}
                                  </span>
                                </div>
                                <div className="small text-muted mt-1">
                                  {t('admin:distanceStraightLine', 'Calculated Distance')}:{' '}
                                  <strong className="text-dark">
                                    {recTeam.distanceKm !== null ? `${recTeam.distanceKm} km` : 'Uncalibrated'}
                                  </strong>{' '}
                                  <span className="text-secondary opacity-75">(Haversine straight-line)</span>
                                </div>
                                {recTeam.contactPhone && (
                                  <div className="small text-muted">
                                    Line: {recTeam.contactPhone}
                                  </div>
                                )}
                              </div>

                              <button
                                type="button"
                                disabled={isAssigningTeam}
                                onClick={() => handleAssignTeam(selectedIncident.id, recTeam.id)}
                                className={`btn btn-sm rounded-pill px-3 fw-bold d-flex align-items-center gap-1 ${
                                  index === 0 ? 'btn-danger shadow-sm' : 'btn-outline-danger'
                                }`}
                              >
                                {isAssigningTeam ? <span className="spinner-border spinner-border-sm" /> : <Radio size={14} />}
                                <span>{t('admin:assignTeamBtn', 'Dispatch Team')}</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Status Lifecycle Controller */}
                <div className="mb-4 p-3 rounded-3 border bg-white">
                  <div className="fw-bold text-dark small mb-2">Update Incident Status:</div>
                  <div className="d-flex flex-wrap gap-2">
                    {['Reported', 'Assigned', 'In Progress', 'Resolved', 'Cancelled'].map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleUpdateStatus(selectedIncident.id, st)}
                        className={`btn btn-sm rounded-pill px-3 fw-bold ${
                          selectedIncident.status === st ? 'btn-dark' : 'btn-outline-secondary'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Severity Override Controller */}
                <div className="mb-4 p-3 rounded-3 border bg-white">
                  <div className="fw-bold text-dark small mb-2">Confirm or Override Severity:</div>
                  <div className="d-flex flex-wrap gap-2">
                    {['Low', 'Medium', 'High', 'Critical'].map((sev) => (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => handleOverrideSeverity(selectedIncident.id, sev)}
                        className={`btn btn-sm rounded-pill px-3 fw-bold ${
                          selectedIncident.confirmedSeverity === sev
                            ? 'btn-danger'
                            : 'btn-outline-danger'
                        }`}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>
                  <div className="text-muted small mt-2">
                    System suggested severity was:{' '}
                    <strong>{selectedIncident.suggestedSeverity}</strong>
                  </div>
                </div>

                {/* Reporter & People info */}
                <div className="row g-2 small border-top pt-3">
                  <div className="col-6">
                    <span className="text-muted">People in Danger:</span>
                    <div className="fw-bold text-dark">{selectedIncident.peopleCountText || selectedIncident.peopleBracket}</div>
                  </div>
                  <div className="col-6">
                    <span className="text-muted">Contact Info:</span>
                    <div className="fw-bold text-dark">
                      {selectedIncident.contactName || 'Anonymous'} ({selectedIncident.contactPhone || 'No Phone'})
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Location Map & Status History Log */}
            <div className="col-12 col-lg-5">
              {/* Incident Location Map */}
              <div className="card rounded-4 border-0 shadow-sm p-3 bg-white mb-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h6 className="fw-bold text-dark mb-0">Location Coordinates</h6>
                  <span className="badge bg-light text-dark border">
                    GPS ±{selectedIncident.accuracy || 10}m
                  </span>
                </div>
                <div className="text-secondary small mb-2">{selectedIncident.address}</div>
                <GoogleMapsCanvas
                  lat={selectedIncident.latitude || 11.0168}
                  lng={selectedIncident.longitude || 76.9558}
                  accuracy={selectedIncident.accuracy || 10}
                  address={selectedIncident.address}
                  interactive={false}
                  height={220}
                  fallbackComponent={
                    <InteractiveMapCanvas
                      lat={selectedIncident.latitude || 11.0168}
                      lng={selectedIncident.longitude || 76.9558}
                      accuracy={selectedIncident.accuracy || 10}
                      address={selectedIncident.address}
                      interactive={false}
                      height={220}
                    />
                  }
                />
              </div>

              {/* Status Timeline Audit History */}
              <div className="card rounded-4 border-0 shadow-sm p-3 bg-white">
                <h6 className="fw-bold text-dark mb-3">Status Audit History</h6>
                <div className="timeline ps-2" style={{ borderLeft: '2px solid #E5E7EB' }}>
                  {(selectedIncident.statusHistory || []).map((h: any, idx: number) => (
                    <div key={h.id || idx} className="mb-3 ps-3 position-relative">
                      <div
                        className="rounded-circle position-absolute"
                        style={{
                          width: 10,
                          height: 10,
                          backgroundColor: UYRA_COLORS.primaryRed,
                          left: -22,
                          top: 4,
                        }}
                      />
                      <div className="d-flex align-items-center justify-content-between">
                        <span className="badge bg-secondary small">{h.status}</span>
                        <span className="text-muted small">
                          {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="small fw-semibold text-dark mt-1">{h.actor}</div>
                      <div className="text-muted small">{h.note}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB: RESPONSE TEAMS MANAGEMENT (ROUND 2 PHASE 2)                   */}
      {/* ------------------------------------------------------------------ */}
      {adminScreen === 'teams' && (
        <div className="container-fluid py-4 px-3 px-md-4">
          {/* Header & Quick Action */}
          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
            <div>
              <h4 className="fw-bold text-dark mb-1">{t('admin:teamsOverviewTitle')}</h4>
              <p className="text-secondary small mb-0">{t('admin:teamsOverviewDesc')}</p>
            </div>
            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                onClick={openCreateTeamModal}
                className="btn btn-danger rounded-pill px-3 py-2 fw-semibold d-flex align-items-center gap-2 shadow-sm"
              >
                <PlusCircle size={16} />
                <span>{t('admin:createTeamBtn')}</span>
              </button>
              <button
                type="button"
                onClick={fetchTeams}
                className="btn btn-outline-secondary rounded-pill px-3 py-2 d-flex align-items-center gap-1"
              >
                <RefreshCw size={14} className={isLoadingTeams ? 'spin' : ''} />
                <span className="small">{t('admin:refresh')}</span>
              </button>
            </div>
          </div>

          {/* 5 Status Counters / KPI Cards */}
          <div className="row g-3 mb-4">
            <div className="col-6 col-lg">
              <div className="card rounded-4 border-0 shadow-sm p-3 bg-white h-100 border-start border-4 border-primary">
                <div className="text-muted small fw-semibold text-uppercase">{t('admin:totalTeams')}</div>
                <div className="fs-3 fw-bold text-dark mt-1">{teamsCounts.total}</div>
                <div className="text-muted small">Registered fleet units</div>
              </div>
            </div>
            <div className="col-6 col-lg">
              <div className="card rounded-4 border-0 shadow-sm p-3 bg-white h-100 border-start border-4 border-success">
                <div className="text-success small fw-semibold text-uppercase">{t('admin:availableTeams')}</div>
                <div className="fs-3 fw-bold text-success mt-1">{teamsCounts.available}</div>
                <div className="text-muted small">Ready for immediate dispatch</div>
              </div>
            </div>
            <div className="col-6 col-lg">
              <div className="card rounded-4 border-0 shadow-sm p-3 bg-white h-100 border-start border-4 border-warning">
                <div className="text-warning small fw-semibold text-uppercase">{t('admin:busyTeams')}</div>
                <div className="fs-3 fw-bold text-warning mt-1">{teamsCounts.busy}</div>
                <div className="text-muted small">Occupied on-scene</div>
              </div>
            </div>
            <div className="col-6 col-lg">
              <div className="card rounded-4 border-0 shadow-sm p-3 bg-white h-100 border-start border-4 border-danger">
                <div className="text-danger small fw-semibold text-uppercase">{t('admin:dispatchedTeams')}</div>
                <div className="fs-3 fw-bold text-danger mt-1">{teamsCounts.dispatched}</div>
                <div className="text-muted small">En route to incidents</div>
              </div>
            </div>
            <div className="col-6 col-lg">
              <div className="card rounded-4 border-0 shadow-sm p-3 bg-white h-100 border-start border-4 border-secondary">
                <div className="text-secondary small fw-semibold text-uppercase">{t('admin:offDutyTeams')}</div>
                <div className="fs-3 fw-bold text-secondary mt-1">{teamsCounts.offDuty}</div>
                <div className="text-muted small">Inactive / maintenance</div>
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="card rounded-4 border-0 shadow-sm p-3 bg-white mb-3">
            <div className="row g-2 align-items-center">
              <div className="col-12 col-md-5">
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">
                    <Search size={16} className="text-muted" />
                  </span>
                  <input
                    type="text"
                    className="form-control bg-light border-start-0"
                    placeholder={t('admin:searchTeamsPlaceholder')}
                    value={teamSearchQuery}
                    onChange={(e) => setTeamSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') fetchTeams();
                    }}
                  />
                  {teamSearchQuery && (
                    <button
                      className="btn btn-light border-top border-bottom border-end"
                      type="button"
                      onClick={() => {
                        setTeamSearchQuery('');
                        setTimeout(fetchTeams, 0);
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="col-6 col-md-3">
                <select
                  className="form-select"
                  value={filterTeamCategory}
                  onChange={(e) => {
                    setFilterTeamCategory(e.target.value);
                    setTimeout(fetchTeams, 0);
                  }}
                >
                  <option value="ALL">{t('admin:allCategories')}</option>
                  <option value="Medical Emergency">Medical</option>
                  <option value="Fire Emergency">Fire</option>
                  <option value="Building Collapse">Rescue</option>
                  <option value="Flood">Disaster</option>
                  <option value="Other Emergencies">Police / General</option>
                  <option value="Road Accident">Road Accident</option>
                </select>
              </div>

              <div className="col-6 col-md-3">
                <select
                  className="form-select"
                  value={filterTeamStatus}
                  onChange={(e) => {
                    setFilterTeamStatus(e.target.value);
                    setTimeout(fetchTeams, 0);
                  }}
                >
                  <option value="ALL">{t('admin:allAvailability')}</option>
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="DISPATCHED">DISPATCHED</option>
                  <option value="BUSY">BUSY</option>
                  <option value="OFF_DUTY">OFF_DUTY</option>
                </select>
              </div>

              <div className="col-12 col-md-1">
                <button
                  type="button"
                  onClick={fetchTeams}
                  className="btn btn-primary w-100 rounded-pill fw-semibold"
                >
                  Go
                </button>
              </div>
            </div>
          </div>

          {/* Teams Table */}
          <div className="card rounded-4 border-0 shadow-sm bg-white overflow-hidden">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.86rem' }}>
                <thead className="table-light">
                  <tr>
                    <th className="ps-3">{t('admin:colTeamName')}</th>
                    <th>{t('admin:colCategory')}</th>
                    <th>{t('admin:colLocation')}</th>
                    <th>{t('admin:colContact')}</th>
                    <th>{t('admin:colStatus')}</th>
                    <th>{t('admin:colAssignments')}</th>
                    <th className="text-end pe-3">{t('admin:colActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-5 text-muted">
                        <Truck size={36} className="opacity-30 mb-2" />
                        <div>{t('admin:noTeamsFound')}</div>
                      </td>
                    </tr>
                  ) : (
                    teams.map((tm) => {
                      const statusColor =
                        tm.status === 'AVAILABLE'
                          ? 'success'
                          : tm.status === 'DISPATCHED'
                          ? 'danger'
                          : tm.status === 'BUSY'
                          ? 'warning'
                          : 'secondary';

                      return (
                        <tr key={tm.id}>
                          <td className="ps-3">
                            <div className="fw-bold text-dark">{tm.name}</div>
                            {tm.notes && (
                              <div className="text-muted small text-truncate" style={{ maxWidth: 240 }}>
                                {tm.notes}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className="badge bg-light text-dark border">
                              {tm.categoryLabel || tm.category}
                            </span>
                          </td>
                          <td className="font-monospace text-secondary small">
                            <Navigation size={12} className="me-1 text-danger" />
                            {tm.latitude.toFixed(4)}°, {tm.longitude.toFixed(4)}°
                          </td>
                          <td>
                            {tm.contactPhone ? (
                              <span className="d-flex align-items-center gap-1 small text-dark">
                                <Phone size={12} className="text-muted" />
                                {tm.contactPhone}
                              </span>
                            ) : (
                              <span className="text-muted small">—</span>
                            )}
                          </td>
                          <td>
                            <div className="dropdown">
                              <button
                                className={`btn btn-sm btn-outline-${statusColor} dropdown-toggle rounded-pill px-2 py-0 fw-semibold`}
                                type="button"
                                data-bs-toggle="dropdown"
                                style={{ fontSize: '0.75rem' }}
                              >
                                {tm.status}
                              </button>
                              <ul className="dropdown-menu shadow border-0">
                                <li>
                                  <button
                                    className="dropdown-item text-success fw-semibold"
                                    onClick={() => handleUpdateTeamStatus(tm.id, 'AVAILABLE')}
                                  >
                                    AVAILABLE
                                  </button>
                                </li>
                                <li>
                                  <button
                                    className="dropdown-item text-danger fw-semibold"
                                    onClick={() => handleUpdateTeamStatus(tm.id, 'DISPATCHED')}
                                  >
                                    DISPATCHED
                                  </button>
                                </li>
                                <li>
                                  <button
                                    className="dropdown-item text-warning fw-semibold"
                                    onClick={() => handleUpdateTeamStatus(tm.id, 'BUSY')}
                                  >
                                    BUSY
                                  </button>
                                </li>
                                <li><hr className="dropdown-divider" /></li>
                                <li>
                                  <button
                                    className="dropdown-item text-secondary fw-semibold"
                                    onClick={() => handleUpdateTeamStatus(tm.id, 'OFF_DUTY')}
                                  >
                                    OFF_DUTY
                                  </button>
                                </li>
                              </ul>
                            </div>
                          </td>
                          <td>
                            <span className="badge bg-light text-secondary border">
                              {tm.totalAssignments || 0} missions
                            </span>
                          </td>
                          <td className="text-end pe-3">
                            <div className="d-flex justify-content-end gap-1">
                              <button
                                type="button"
                                onClick={() => fetchTeamDetails(tm.id)}
                                className="btn btn-sm btn-light border rounded-pill px-2"
                                title="Inspect Dossier"
                              >
                                <Eye size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditTeamModal(tm)}
                                className="btn btn-sm btn-light border rounded-pill px-2"
                                title="Edit"
                              >
                                <Edit size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmTeam(tm)}
                                className="btn btn-sm btn-outline-danger rounded-pill px-2"
                                title="Delete"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* VIEW: TEAM DETAILS & ASSIGNMENT HISTORY (ROUND 2 PHASE 2)          */}
      {/* ------------------------------------------------------------------ */}
      {adminScreen === 'team_details' && selectedTeam && (
        <div className="container-fluid py-4 px-3 px-md-4">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                onClick={() => setAdminScreen('teams')}
                className="btn btn-sm btn-outline-secondary rounded-pill px-3"
              >
                ← Back to Teams
              </button>
              <h4 className="fw-bold text-dark mb-0">{selectedTeam.name}</h4>
              <span className="badge bg-danger rounded-pill px-3 py-1">
                {selectedTeam.categoryLabel || selectedTeam.category}
              </span>
            </div>
            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                onClick={() => openEditTeamModal(selectedTeam)}
                className="btn btn-sm btn-light border rounded-pill px-3 fw-semibold d-flex align-items-center gap-1"
              >
                <Edit size={14} />
                <span>Edit Team</span>
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirmTeam(selectedTeam)}
                className="btn btn-sm btn-outline-danger rounded-pill px-3 fw-semibold d-flex align-items-center gap-1"
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            </div>
          </div>

          <div className="row g-3">
            {/* Team Specs Card */}
            <div className="col-12 col-lg-4">
              <div className="card rounded-4 border-0 shadow-sm p-4 bg-white mb-3">
                <h6 className="fw-bold text-dark text-uppercase small mb-3 border-bottom pb-2">
                  Fleet Specifications
                </h6>
                <div className="mb-3">
                  <div className="text-muted small">Current Availability</div>
                  <div className="d-flex align-items-center gap-2 mt-1">
                    <span className={`badge rounded-pill px-3 py-1 bg-${
                      selectedTeam.status === 'AVAILABLE'
                        ? 'success'
                        : selectedTeam.status === 'DISPATCHED'
                        ? 'danger'
                        : selectedTeam.status === 'BUSY'
                        ? 'warning'
                        : 'secondary'
                    }`}>
                      {selectedTeam.status}
                    </span>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="text-muted small">Base Station Coordinates</div>
                  <div className="fw-semibold font-monospace small text-dark mt-1">
                    {selectedTeam.latitude.toFixed(6)}° N, {selectedTeam.longitude.toFixed(6)}° E
                  </div>
                </div>

                <div className="mb-3">
                  <div className="text-muted small">Emergency Contact</div>
                  <div className="fw-semibold small text-dark mt-1">
                    {selectedTeam.contactPhone || 'None specified'}
                  </div>
                </div>

                <div className="mb-3">
                  <div className="text-muted small">Operational Notes / Apparatus</div>
                  <div className="small text-secondary mt-1 bg-light p-2 rounded-3 border">
                    {selectedTeam.notes || 'No notes on record.'}
                  </div>
                </div>

                <hr />
                <h6 className="fw-bold text-dark small mb-2">Change Status</h6>
                <div className="d-flex flex-wrap gap-2">
                  {['AVAILABLE', 'DISPATCHED', 'BUSY', 'OFF_DUTY'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      disabled={selectedTeam.status === st}
                      onClick={() => handleUpdateTeamStatus(selectedTeam.id, st)}
                      className={`btn btn-sm rounded-pill px-3 fw-semibold ${
                        selectedTeam.status === st ? 'btn-secondary text-white' : 'btn-outline-dark'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Assignments & History */}
            <div className="col-12 col-lg-8">
              {/* Active Assignment (if any) */}
              <div className="card rounded-4 border-0 shadow-sm p-4 bg-white mb-3 border-start border-4 border-danger">
                <h6 className="fw-bold text-dark text-uppercase small mb-2">
                  {t('admin:activeAssignmentLabel')}
                </h6>
                {selectedTeam.activeAssignment ? (
                  <div className="bg-light p-3 rounded-3 border mt-2">
                    <div className="d-flex align-items-center justify-content-between">
                      <span className="fw-bold text-danger">
                        {selectedTeam.activeAssignment.incident?.referenceNumber || 'Incident Assigned'}
                      </span>
                      <span className="badge bg-danger rounded-pill">
                        {selectedTeam.activeAssignment.status}
                      </span>
                    </div>
                    <div className="fw-semibold text-dark mt-1">
                      {selectedTeam.activeAssignment.incident?.title}
                    </div>
                    <div className="text-muted small mt-1">
                      Assigned by: {selectedTeam.activeAssignment.assignedBy || 'System'} •{' '}
                      {new Date(selectedTeam.activeAssignment.assignedAt).toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <div className="text-secondary small py-2">
                    {t('admin:noActiveAssignment')}
                  </div>
                )}
              </div>

              {/* Assignment History */}
              <div className="card rounded-4 border-0 shadow-sm p-4 bg-white">
                <h6 className="fw-bold text-dark text-uppercase small mb-3 border-bottom pb-2">
                  {t('admin:assignmentHistoryLabel')} ({selectedTeam.assignments?.length || 0})
                </h6>

                {(!selectedTeam.assignments || selectedTeam.assignments.length === 0) ? (
                  <div className="text-center py-4 text-muted small">
                    {t('admin:noAssignmentHistory')}
                  </div>
                ) : (
                  <div className="list-group list-group-flush">
                    {selectedTeam.assignments.map((as: any) => (
                      <div key={as.id} className="list-group-item px-0 py-3">
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <span className="fw-bold text-dark">
                            {as.incident?.referenceNumber || as.incidentId}
                          </span>
                          <span className="badge bg-secondary rounded-pill">{as.status}</span>
                        </div>
                        <div className="small text-dark fw-semibold">{as.incident?.title}</div>
                        {as.incident?.address && (
                          <div className="small text-muted">{as.incident.address}</div>
                        )}
                        <div className="small text-secondary mt-1">
                          Assigned: {new Date(as.assignedAt).toLocaleString()}
                          {as.completedAt && ` • Completed: ${new Date(as.completedAt).toLocaleString()}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

{/* ------------------------------------------------------------------ */}
      {/* TAB: ADVANCED ANALYTICS DASHBOARD (ROUND 2 PHASE 5)                */}
      {/* ------------------------------------------------------------------ */}
      {adminScreen === 'analytics' && (
        <div className="container-fluid py-4 px-3 px-md-4">
          {/* Header */}
          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
            <div>
              <div className="d-flex align-items-center gap-2">
                <h4 className="fw-bold text-dark mb-1">{t('admin:analyticsOverviewTitle')}</h4>
                <span className="badge bg-danger rounded-pill px-3 py-1 font-monospace" style={{ fontSize: '0.72rem' }}>
                  PHASE 5 ENGINE
                </span>
              </div>
              <p className="text-secondary small mb-0">{t('admin:analyticsOverviewDesc')}</p>
            </div>
            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                onClick={fetchAnalytics}
                className="btn btn-outline-secondary rounded-pill px-3 py-2 d-flex align-items-center gap-2 shadow-xs"
              >
                <RefreshCw size={14} className={isLoadingAnalytics ? 'spin' : ''} />
                <span className="small fw-semibold">{t('admin:refreshAnalytics')}</span>
              </button>
            </div>
          </div>

          {/* Top Row: 6 Comprehensive KPI Metric Cards */}
          <div className="row g-3 mb-4">
            <div className="col-6 col-md-4 col-xl-2">
              <div className="card rounded-4 border-0 shadow-sm p-3 bg-white h-100 border-start border-4 border-primary">
                <div className="text-muted small fw-semibold text-uppercase">{t('admin:kpiTotal')}</div>
                <div className="fs-3 fw-bold text-dark mt-1">
                  {analyticsData?.kpi?.totalIncidents ?? incidents.length}
                </div>
                <div className="text-muted small">All recorded reports</div>
              </div>
            </div>

            <div className="col-6 col-md-4 col-xl-2">
              <div className="card rounded-4 border-0 shadow-sm p-3 bg-white h-100 border-start border-4 border-danger">
                <div className="text-danger small fw-semibold text-uppercase">{t('admin:kpiCritical')}</div>
                <div className="fs-3 fw-bold text-danger mt-1">
                  {analyticsData?.kpi?.criticalIncidents ?? 0}
                </div>
                <div className="text-muted small">Max urgency triage</div>
              </div>
            </div>

            <div className="col-6 col-md-4 col-xl-2">
              <div className="card rounded-4 border-0 shadow-sm p-3 bg-white h-100 border-start border-4 border-info">
                <div className="text-info small fw-semibold text-uppercase">{t('admin:assignedIncidents')}</div>
                <div className="fs-3 fw-bold text-info mt-1">
                  {analyticsData?.kpi?.assignedIncidents ?? 0}
                </div>
                <div className="text-muted small">Teams actively deployed</div>
              </div>
            </div>

            <div className="col-6 col-md-4 col-xl-2">
              <div className="card rounded-4 border-0 shadow-sm p-3 bg-white h-100 border-start border-4 border-warning">
                <div className="text-warning small fw-semibold text-uppercase">{t('admin:kpiInProgress')}</div>
                <div className="fs-3 fw-bold text-warning mt-1">
                  {analyticsData?.kpi?.inProgressIncidents ?? 0}
                </div>
                <div className="text-muted small">Active on-scene actions</div>
              </div>
            </div>

            <div className="col-6 col-md-4 col-xl-2">
              <div className="card rounded-4 border-0 shadow-sm p-3 bg-white h-100 border-start border-4 border-success">
                <div className="text-success small fw-semibold text-uppercase">{t('admin:resolutionRate')}</div>
                <div className="fs-3 fw-bold text-success mt-1">
                  {analyticsData?.kpi?.resolutionRate ?? 0}%
                </div>
                <div className="text-muted small">
                  {analyticsData?.kpi?.resolvedIncidents ?? 0} resolved total
                </div>
              </div>
            </div>

            <div className="col-6 col-md-4 col-xl-2">
              <div className="card rounded-4 border-0 shadow-sm p-3 bg-white h-100 border-start border-4 border-dark">
                <div className="text-dark small fw-semibold text-uppercase">{t('admin:fleetDeploymentRate')}</div>
                <div className="fs-3 fw-bold text-dark mt-1">
                  {analyticsData?.fleetSummary?.deploymentPercentage ?? 0}%
                </div>
                <div className="text-muted small">
                  {analyticsData?.kpi?.availableTeams ?? 0} units ready
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Charts Grid (Priority Distribution & Category Breakdown) */}
          <div className="row g-4 mb-4">
            {/* Chart 1: Priority Distribution Breakdown */}
            <div className="col-12 col-xl-6">
              <div className="card rounded-4 border-0 shadow-sm p-4 bg-white h-100">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h6 className="fw-bold text-dark mb-0">{t('admin:priorityDistTitle')}</h6>
                  <span className="badge bg-light text-dark border">Phase 1 Engine</span>
                </div>
                <p className="text-secondary small mb-3">{t('admin:priorityDistDesc')}</p>

                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData?.distributions?.byPriority || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                      <RechartsTooltip
                        formatter={(val: any) => [`${val} incidents`, 'Volume']}
                        contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {(analyticsData?.distributions?.byPriority || []).map((entry: any, index: number) => (
                          <Cell key={`cell-prio-${index}`} fill={entry.fill || '#DC2626'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Chart 2: Emergency Category Breakdown */}
            <div className="col-12 col-xl-6">
              <div className="card rounded-4 border-0 shadow-sm p-4 bg-white h-100">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h6 className="fw-bold text-dark mb-0">{t('admin:categoryBreakdownTitle')}</h6>
                  <span className="badge bg-light text-dark border">Hazard Domain</span>
                </div>
                <p className="text-secondary small mb-3">{t('admin:categoryBreakdownDesc')}</p>

                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={analyticsData?.distributions?.byCategory || []}
                      margin={{ top: 10, right: 20, left: 20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#334155' }} width={120} />
                      <RechartsTooltip
                        formatter={(val: any) => [`${val} reports`, 'Incidents']}
                        contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Bar dataKey="count" fill="#E50914" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Fleet Availability & Incident Lifecycle Progression */}
          <div className="row g-4 mb-4">
            {/* Chart 3: Fleet Availability Status */}
            <div className="col-12 col-xl-6">
              <div className="card rounded-4 border-0 shadow-sm p-4 bg-white h-100">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h6 className="fw-bold text-dark mb-0">{t('admin:fleetAvailabilityTitle')}</h6>
                  <span className="badge bg-success rounded-pill px-2 py-1 font-monospace">
                    {analyticsData?.kpi?.totalTeams ?? 0} TOTAL UNITS
                  </span>
                </div>
                <p className="text-secondary small mb-3">{t('admin:fleetAvailabilityDesc')}</p>

                <div className="d-flex flex-column flex-sm-row align-items-center justify-content-center" style={{ height: 260 }}>
                  <div style={{ width: '100%', maxWidth: 260, height: 240 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analyticsData?.distributions?.byTeamAvailability || []}
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={4}
                          dataKey="count"
                        >
                          {(analyticsData?.distributions?.byTeamAvailability || []).map((entry: any, index: number) => (
                            <Cell key={`cell-team-${index}`} fill={entry.fill || '#64748B'} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(val: any, name: any) => [`${val} Teams`, name]}
                          contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="d-flex flex-column gap-2 ms-sm-3 mt-3 mt-sm-0">
                    {(analyticsData?.distributions?.byTeamAvailability || []).map((entry: any) => (
                      <div key={entry.name} className="d-flex align-items-center gap-2 small">
                        <span className="rounded-circle d-inline-block" style={{ width: 10, height: 10, backgroundColor: entry.fill }} />
                        <span className="fw-semibold text-dark">{entry.name}:</span>
                        <span className="text-muted">{entry.count} units</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Chart 4: Lifecycle Pipeline Progression */}
            <div className="col-12 col-xl-6">
              <div className="card rounded-4 border-0 shadow-sm p-4 bg-white h-100">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h6 className="fw-bold text-dark mb-0">{t('admin:lifecycleTrendTitle')}</h6>
                  <span className="badge bg-light text-dark border">Operational Pipeline</span>
                </div>
                <p className="text-secondary small mb-3">{t('admin:lifecycleTrendDesc')}</p>

                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData?.distributions?.assignedVsResolved || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="stage" tick={{ fontSize: 11, fill: '#64748B' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                      <RechartsTooltip
                        formatter={(val: any) => [`${val} incidents`, 'Stage Count']}
                        contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Bar dataKey="count" fill="#4F46E5" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Row 4: Fleet & Incident Volume Summary Cards */}
          <div className="row g-4">
            <div className="col-12 col-md-6">
              <div className="card rounded-4 border-0 shadow-sm p-4 bg-white h-100">
                <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                  <Truck size={18} className="text-danger" />
                  <span>{t('admin:fleetSummaryTitle')}</span>
                </h6>
                <div className="list-group list-group-flush">
                  <div className="list-group-item px-0 d-flex justify-content-between align-items-center">
                    <span className="text-secondary small">Total Fleet Registered</span>
                    <span className="fw-bold text-dark">{analyticsData?.fleetSummary?.totalTeams ?? 0}</span>
                  </div>
                  <div className="list-group-item px-0 d-flex justify-content-between align-items-center">
                    <span className="text-secondary small">Available for Instant Dispatch</span>
                    <span className="fw-bold text-success">{analyticsData?.fleetSummary?.availableTeams ?? 0}</span>
                  </div>
                  <div className="list-group-item px-0 d-flex justify-content-between align-items-center">
                    <span className="text-secondary small">Dispatched & In Transit</span>
                    <span className="fw-bold text-danger">{analyticsData?.fleetSummary?.dispatchedTeams ?? 0}</span>
                  </div>
                  <div className="list-group-item px-0 d-flex justify-content-between align-items-center">
                    <span className="text-secondary small">Busy On-Scene</span>
                    <span className="fw-bold text-warning">{analyticsData?.fleetSummary?.busyTeams ?? 0}</span>
                  </div>
                  <div className="list-group-item px-0 d-flex justify-content-between align-items-center">
                    <span className="text-secondary small">Off-Duty / Maintenance</span>
                    <span className="fw-bold text-secondary">{analyticsData?.fleetSummary?.offDutyTeams ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-6">
              <div className="card rounded-4 border-0 shadow-sm p-4 bg-white h-100">
                <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                  <AlertOctagon size={18} className="text-danger" />
                  <span>{t('admin:incidentVolumeTitle')}</span>
                </h6>
                <div className="list-group list-group-flush">
                  <div className="list-group-item px-0 d-flex justify-content-between align-items-center">
                    <span className="text-secondary small">Total Incident Reports</span>
                    <span className="fw-bold text-dark">{analyticsData?.incidentVolume?.total ?? 0}</span>
                  </div>
                  <div className="list-group-item px-0 d-flex justify-content-between align-items-center">
                    <span className="text-secondary small">Active Emergencies</span>
                    <span className="fw-bold text-danger">{analyticsData?.incidentVolume?.active ?? 0}</span>
                  </div>
                  <div className="list-group-item px-0 d-flex justify-content-between align-items-center">
                    <span className="text-secondary small">Successfully Resolved</span>
                    <span className="fw-bold text-success">{analyticsData?.incidentVolume?.resolved ?? 0}</span>
                  </div>
                  <div className="list-group-item px-0 d-flex justify-content-between align-items-center">
                    <span className="text-secondary small">Critical Severity Ratio</span>
                    <span className="fw-bold text-danger">{analyticsData?.incidentVolume?.criticalRatio ?? 0}%</span>
                  </div>
                  <div className="list-group-item px-0 d-flex justify-content-between align-items-center">
                    <span className="text-secondary small">Last Evaluation Timestamp</span>
                    <span className="font-monospace small text-muted">
                      {analyticsData?.timestamp ? new Date(analyticsData.timestamp).toLocaleTimeString() : 'Live'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

{/* ------------------------------------------------------------------ */}
      {/* TAB 4: GEOSPATIAL MAP VIEW                                         */}
      {/* ------------------------------------------------------------------ */}
      {adminScreen === 'map' && (
        <div className="container-fluid py-4 px-3 px-md-4">
          <div className="card rounded-4 border-0 shadow-sm p-3 bg-white mb-3">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <h5 className="fw-bold text-dark mb-0">Active Incidents Geographical Distribution</h5>
              <span className="badge bg-danger rounded-pill px-3 py-1">
                {incidents.length} Markers Plotted
              </span>
            </div>
            <p className="text-secondary small mb-3">
              Click any incident marker pin to inspect live details or transition status.
            </p>
            <GoogleMapsCanvas
              markers={incidents}
              teams={teams}
              highlightId={selectedIncidentId}
              onSelectMarker={(m) => {
                setSelectedIncidentId(m.id);
                setAdminScreen('details');
              }}
              onSelectTeam={(tm) => {
                fetchTeamDetails(tm.id);
              }}
              height={480}
              fallbackComponent={
                <InteractiveMapCanvas
                  markers={incidents}
                  highlightId={selectedIncidentId}
                  onSelectMarker={(m) => {
                    setSelectedIncidentId(m.id);
                    setAdminScreen('details');
                  }}
                  height={480}
                />
              }
            />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* DELETE CONFIRMATION MODAL                                          */}
      {/* ------------------------------------------------------------------ */}
      {deleteConfirmIncident && (
        <div
          className="position-fixed top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center p-3"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1090 }}
        >
          <div className="bg-white rounded-4 p-4 shadow-lg border" style={{ maxWidth: 440, width: '100%' }}>
            <h5 className="fw-bold text-dark mb-2">Confirm Removal</h5>
            <p className="text-secondary small mb-3">
              Are you sure you want to delete incident{' '}
              <strong>{deleteConfirmIncident.id}</strong> ({deleteConfirmIncident.title})? This action removes it permanently from the database.
            </p>
            <div className="d-flex justify-content-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmIncident(null)}
                className="btn btn-light border rounded-pill px-3"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRemoveIncident(deleteConfirmIncident.id)}
                className="btn btn-danger rounded-pill px-4 fw-bold"
              >
                Delete Incident
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* CREATE / EDIT TEAM MODAL (ROUND 2 PHASE 2)                         */}
      {/* ------------------------------------------------------------------ */}
      {isCreateTeamOpen && (
        <div
          className="position-fixed top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center p-3"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1095 }}
        >
          <div className="bg-white rounded-4 p-4 shadow-lg border" style={{ maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
              <h5 className="fw-bold text-dark mb-0">
                {editingTeam ? t('admin:editTeamModalTitle') : t('admin:createTeamModalTitle')}
              </h5>
              <button
                type="button"
                onClick={() => setIsCreateTeamOpen(false)}
                className="btn btn-sm btn-light rounded-circle"
              >
                <X size={16} />
              </button>
            </div>

            {teamFormError && (
              <div className="alert alert-danger py-2 small rounded-3 mb-3">
                {teamFormError}
              </div>
            )}

            <form onSubmit={handleSaveTeam}>
              <div className="mb-3">
                <label className="form-label small fw-semibold text-dark">{t('admin:teamNameLabel')} *</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  placeholder={t('admin:teamNamePlaceholder')}
                  value={teamFormName}
                  onChange={(e) => setTeamFormName(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-dark">{t('admin:categoryLabel')} *</label>
                <select
                  className="form-select"
                  value={teamFormCategory}
                  onChange={(e) => setTeamFormCategory(e.target.value)}
                >
                  <option value="Medical Emergency">Medical</option>
                  <option value="Fire Emergency">Fire</option>
                  <option value="Building Collapse">Rescue</option>
                  <option value="Flood">Disaster</option>
                  <option value="Other Emergencies">Police / General</option>
                  <option value="Road Accident">Road Accident</option>
                </select>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold text-dark">{t('admin:latitudeLabel')} *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    min={-90}
                    max={90}
                    className="form-control"
                    value={teamFormLat}
                    onChange={(e) => setTeamFormLat(e.target.value)}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold text-dark">{t('admin:longitudeLabel')} *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    min={-180}
                    max={180}
                    className="form-control"
                    value={teamFormLng}
                    onChange={(e) => setTeamFormLng(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-dark">{t('admin:contactPhoneLabel')}</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder={t('admin:contactPhonePlaceholder')}
                  value={teamFormPhone}
                  onChange={(e) => setTeamFormPhone(e.target.value)}
                />
              </div>

              <div className="mb-4">
                <label className="form-label small fw-semibold text-dark">{t('admin:notesLabel')}</label>
                <textarea
                  rows={3}
                  className="form-control"
                  placeholder={t('admin:notesPlaceholder')}
                  value={teamFormNotes}
                  onChange={(e) => setTeamFormNotes(e.target.value)}
                />
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateTeamOpen(false)}
                  className="btn btn-light border rounded-pill px-3"
                >
                  {t('admin:cancelBtn')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTeam}
                  className="btn btn-danger rounded-pill px-4 fw-bold"
                >
                  {isSubmittingTeam ? 'Saving...' : t('admin:saveTeamBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* DELETE TEAM CONFIRMATION MODAL (ROUND 2 PHASE 2)                   */}
      {/* ------------------------------------------------------------------ */}
      {deleteConfirmTeam && (
        <div
          className="position-fixed top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center p-3"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1096 }}
        >
          <div className="bg-white rounded-4 p-4 shadow-lg border" style={{ maxWidth: 440, width: '100%' }}>
            <h5 className="fw-bold text-dark mb-2">{t('admin:deleteTeamConfirmTitle')}</h5>
            <p className="text-secondary small mb-3">
              {t('admin:deleteTeamConfirmDesc')}
              <br /><br />
              <strong>Team: {deleteConfirmTeam.name}</strong>
            </p>
            {deleteConfirmTeam.totalAssignments > 0 && (
              <div className="alert alert-warning py-2 small mb-3">
                {t('admin:cannotDeleteWithHistory')}
              </div>
            )}
            <div className="d-flex justify-content-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTeam(null)}
                className="btn btn-light border rounded-pill px-3"
              >
                {t('admin:cancelBtn')}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteTeam(deleteConfirmTeam.id)}
                className="btn btn-danger rounded-pill px-4 fw-bold"
              >
                {t('admin:deleteTeam')}
              </button>
            </div>
          </div>
        </div>
      )}

{/* ------------------------------------------------------------------ */}
      {/* FLOATING REAL-TIME TOAST NOTIFICATIONS                             */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="position-fixed bottom-0 end-0 p-3"
        style={{ zIndex: 1099, maxWidth: 360, width: '100%' }}
      >
        {toastQueue.map((t) => (
          <div
            key={t.id}
            className="card border-0 shadow-lg p-3 rounded-3 mb-2 text-white"
            style={{
              backgroundColor: t.type === 'emergency' ? UYRA_COLORS.primaryRed : UYRA_COLORS.deepNavy,
            }}
          >
            <div className="d-flex align-items-center justify-content-between mb-1">
              <span className="fw-bold small">{t.title}</span>
              <span className="badge bg-white text-dark rounded-pill" style={{ fontSize: '0.62rem' }}>
                LIVE
              </span>
            </div>
            <div className="small opacity-90">{t.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
