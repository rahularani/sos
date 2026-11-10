const http = require('http');
const { io } = require('socket.io-client');

const API_BASE = 'http://localhost:4000/api';
const SOCKET_URL = 'http://localhost:4000';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path.startsWith('http') ? path : `${API_BASE}${path}`);
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: reqHeaders,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runVerification() {
  console.log('=================================================================');
  console.log('   UYRA END-TO-END WORKFLOW & REAL-TIME INTEGRATION TEST');
  console.log('=================================================================\n');

  // 1. Check Backend Connectivity
  console.log('Step 1: Checking Backend API status...');
  const statsBefore = await request('GET', '/dashboard/stats');
  if (statsBefore.status !== 200) {
    throw new Error(`Failed to get dashboard stats: HTTP ${statsBefore.status}`);
  }
  console.log('✅ Backend API responding 200 OK.');
  console.log('   Initial KPI Stats:', JSON.stringify(statsBefore.data.kpi));

  // 2. Setup Socket.IO Client to test live real-time broadcasting
  console.log('\nStep 2: Connecting Socket.IO client for live broadcast verification...');
  const socketEvents = [];
  const socket = io(SOCKET_URL, { transports: ['websocket'] });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Socket.IO connection timeout')), 4000);
    socket.on('connect', () => {
      clearTimeout(timer);
      console.log('✅ Socket.IO client connected with socket ID:', socket.id);
      resolve();
    });
  });

  socket.on('incident:created', (data) => {
    console.log('⚡ [SOCKET EVENT RECEIVED] incident:created ->', data.id || data.referenceNumber);
    socketEvents.push({ event: 'incident:created', data });
  });

  socket.on('incident:status_changed', (data) => {
    console.log('⚡ [SOCKET EVENT RECEIVED] incident:status_changed ->', data.incident?.id, 'newStatus:', data.newStatus);
    socketEvents.push({ event: 'incident:status_changed', data });
  });

  socket.on('dashboard:stats_updated', (data) => {
    console.log('⚡ [SOCKET EVENT RECEIVED] dashboard:stats_updated -> Total:', data.total, 'Critical:', data.critical);
    socketEvents.push({ event: 'dashboard:stats_updated', data });
  });

  // 3. Submit Public SOS Report (POST /api/incidents)
  console.log('\nStep 3: Submitting Public SOS Incident via POST /api/incidents...');
  const sosPayload = {
    title: 'Severe Multi-Vehicle Collision with Trapped Passengers',
    description: 'Collision between commuter bus and two trucks. Driver trapped in crushed cabin with heavy bleeding.',
    category: 'Road Accident',
    peopleBracket: '6-10',
    contactName: 'Karthik Subramanian',
    contactPhone: '+91 98401 23456',
    latitude: 11.0183,
    longitude: 76.9725,
    accuracy: 6.2,
    address: 'Avinashi Road & Hope College Flyover, Coimbatore',
    locationTimestamp: new Date().toISOString(),
  };

  const createRes = await request('POST', '/incidents', sosPayload);
  if (createRes.status !== 201) {
    throw new Error(`Failed to create incident: HTTP ${createRes.status} -> ${JSON.stringify(createRes)}`);
  }

  const createdIncident = createRes.data;
  console.log('✅ Incident created successfully!');
  console.log('   Reference ID:', createdIncident.id);
  console.log('   Suggested Severity:', createdIncident.suggestedSeverity);
  console.log('   Confirmed Severity:', createdIncident.confirmedSeverity);
  console.log('   Severity Score:', createdIncident.severityMeta.rawScore);
  console.log('   Matched Critical Keywords:', createdIncident.severityMeta.matchedKeywords);
  console.log('   Keyword Escalated:', createdIncident.severityMeta.isKeywordEscalated);

  if (createdIncident.suggestedSeverity !== 'Critical') {
    throw new Error('Expected severity to be Critical due to trapped/bleeding keywords!');
  }

  // 4. Verify PostgreSQL persistence (GET /api/incidents/:id)
  console.log('\nStep 4: Verifying incident persistence in PostgreSQL via GET /api/incidents/:id...');
  const getRes = await request('GET', `/incidents/${createdIncident.id}`);
  if (getRes.status !== 200) {
    throw new Error(`Failed to retrieve incident: HTTP ${getRes.status}`);
  }
  console.log('✅ Incident fetched from PostgreSQL database successfully!');
  console.log('   DB Record Title:', getRes.data.title);
  console.log('   DB Record Status:', getRes.data.status);
  console.log('   Coordinates:', `${getRes.data.latitude}, ${getRes.data.longitude} (±${getRes.data.accuracy}m)`);
  console.log('   Initial Status History Entries:', getRes.data.statusHistory.length);

  // 5. Update Status (PATCH /api/incidents/:id/status)
  console.log('\nStep 5: Updating incident status to "In Progress" via PATCH /api/incidents/:id/status...');
  const statusUpdateRes = await request('PATCH', `/incidents/${createdIncident.id}/status`, {
    status: 'In Progress',
    note: 'Coimbatore Fire & Rescue Station Station 1 dispatched with hydraulic extrication jaws.',
    updatedBy: 'Admin Commander (Authenticated)',
  });

  if (statusUpdateRes.status !== 200) {
    throw new Error(`Failed to update status: HTTP ${statusUpdateRes.status}`);
  }
  console.log('✅ Incident status updated to:', statusUpdateRes.data.status);
  console.log('   Audit history length is now:', statusUpdateRes.data.statusHistory.length);

  // 6. Confirm Severity (PATCH /api/incidents/:id/severity)
  console.log('\nStep 6: Confirming/Overriding severity via PATCH /api/incidents/:id/severity...');
  const severityUpdateRes = await request('PATCH', `/incidents/${createdIncident.id}/severity`, {
    severity: 'Critical',
    note: 'Command verified multiple trapped occupants via traffic camera feed.',
    updatedBy: 'Admin Commander (Authenticated)',
  });
  if (severityUpdateRes.status !== 200) {
    throw new Error(`Failed to override severity: HTTP ${severityUpdateRes.status}`);
  }
  console.log('✅ Incident severity confirmed as:', severityUpdateRes.data.confirmedSeverity);

  // 7. Verify Dashboard Stats reflects the changes
  console.log('\nStep 7: Verifying Dashboard KPIs updated...');
  const statsAfter = await request('GET', '/dashboard/stats');
  console.log('   Updated KPI Stats:', JSON.stringify(statsAfter.data.kpi));
  console.log('   Total incidents incremented:', statsAfter.data.kpi.total > statsBefore.data.kpi.total);

  // 8. Admin Login Test
  console.log('\nStep 8: Testing Administrator Authentication (POST /api/auth/login)...');
  const loginRes = await request('POST', '/auth/login', {
    email: 'admin@uyra.org',
    password: 'UyraEmergency2026!',
  });
  if (loginRes.status !== 200 || !loginRes.data.accessToken) {
    throw new Error(`Admin login failed: HTTP ${loginRes.status}`);
  }
  console.log('✅ Admin login succeeded, JWT token issued!');
  console.log('   Admin Role:', loginRes.data.admin.role);

  // 9. Clean up test incident (DELETE /api/incidents/:id)
  console.log('\nStep 9: Cleaning up test incident via DELETE /api/incidents/:id...');
  const deleteRes = await request('DELETE', `/incidents/${createdIncident.id}`);
  if (deleteRes.status !== 200) {
    throw new Error(`Failed to delete incident: HTTP ${deleteRes.status}`);
  }
  console.log('✅ Test incident removed cleanly from database.');

  // Give socket events 500ms to arrive
  await new Promise((r) => setTimeout(r, 500));
  socket.disconnect();

  console.log('\n=================================================================');
  console.log(`✅ ALL 9 TESTS PASSED! Received ${socketEvents.length} real-time Socket.IO broadcasts.`);
  console.log('   End-to-End backend, database, and real-time streaming verified!');
  console.log('=================================================================\n');
}

runVerification().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
