import re

file_paths = [
    "/Users/rahulr/Desktop/zuvo/sos/admin-frontend/src/uyra_admin.tsx",
    "/Users/rahulr/Desktop/sos/admin-frontend/src/uyra_admin.tsx"
]

helper_code = """
  // Localized badge and label formatters
  const getLocalizedCategory = (cat: string) => {
    switch (cat) {
      case 'Fire Emergency':
        return t('admin:catFire');
      case 'Medical Emergency':
        return t('admin:catMedical');
      case 'Road Accident':
        return t('admin:catRoad');
      case 'Building Collapse':
        return t('admin:catBuilding');
      case 'Flood':
        return t('admin:catFlood');
      case 'Other Emergencies':
        return t('admin:catOther');
      default:
        return cat;
    }
  };

  const getLocalizedStatus = (st: string) => {
    switch (st) {
      case 'Pending':
        return t('admin:statusPending');
      case 'In Progress':
        return t('admin:statusInProgress');
      case 'Resolved':
        return t('admin:statusResolved');
      default:
        return st;
    }
  };

  const getLocalizedSeverity = (sev: string) => {
    switch (sev) {
      case 'Critical':
        return t('admin:severityCritical');
      case 'High':
        return t('admin:severityHigh');
      case 'Medium':
        return t('admin:severityMedium');
      case 'Low':
        return t('admin:severityLow');
      default:
        return sev;
    }
  };
"""

for path in file_paths:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Insert helper functions
    if "const getLocalizedCategory =" not in content:
        content = content.replace("  // ---------------------------------------------------------------------------", helper_code + "\n  // ---------------------------------------------------------------------------", 1)

    # 2. Login Card Labels
    content = content.replace(
        '<h4 className="fw-black text-dark mb-1">Administrator Sign-In</h4>',
        '<h4 className="fw-black text-dark mb-1">{t(\'admin:signInTitle\')}</h4>'
    )
    content = content.replace(
        '<p className="text-secondary small mb-0">Authorized Command Center Access Only</p>',
        '<p className="text-secondary small mb-0">{t(\'admin:signInSubtitle\')}</p>'
    )
    content = content.replace(
        '<label className="form-label small fw-bold text-dark">Email Address</label>',
        '<label className="form-label small fw-bold text-dark">{t(\'admin:emailLabel\')}</label>'
    )
    content = content.replace(
        '<label className="form-label small fw-bold text-dark">Password</label>',
        '<label className="form-label small fw-bold text-dark">{t(\'admin:passwordLabel\')}</label>'
    )
    content = content.replace(
        '<span>Sign In to Dashboard</span>',
        '<span>{t(\'admin:signInButton\')}</span>'
    )

    # 3. Subnav tab labels
    content = content.replace(
        '<span>KPI Dashboard</span>',
        '<span>{t(\'admin:tabDashboard\')}</span>'
    )
    content = content.replace(
        '<span>Incident Monitor ({incidents.length})</span>',
        '<span>{t(\'admin:tabMonitoring\')} ({incidents.length})</span>'
    )
    content = content.replace(
        '<span>Geospatial Map</span>',
        '<span>{t(\'admin:tabMap\')}</span>'
    )
    content = content.replace(
        '<span>Real-time Sync Active</span>',
        '<span>{t(\'admin:realtimeSyncActive\')}</span>'
    )

    # 4. KPI Card titles & descriptions
    content = content.replace(
        '<span className="text-secondary small fw-semibold text-uppercase">Total Incidents</span>',
        '<span className="text-secondary small fw-semibold text-uppercase">{t(\'admin:kpiTotal\')}</span>'
    )
    content = content.replace(
        '<div className="small text-muted mt-auto pt-1">All recorded SOS reports</div>',
        '<div className="small text-muted mt-auto pt-1">{t(\'admin:kpiTotalDesc\')}</div>'
    )

    content = content.replace(
        '<span className="text-danger small fw-bold text-uppercase">Critical Severity</span>',
        '<span className="text-danger small fw-bold text-uppercase">{t(\'admin:kpiCritical\')}</span>'
    )
    content = content.replace(
        '<div className="small text-danger opacity-75 mt-auto pt-1">Immediate priority</div>',
        '<div className="small text-danger opacity-75 mt-auto pt-1">{t(\'admin:kpiCriticalDesc\')}</div>'
    )

    content = content.replace(
        '<span className="text-warning small fw-bold text-uppercase" style={{ color: \'#92400E\' }}>\n                  Pending Dispatch\n                </span>',
        '<span className="text-warning small fw-bold text-uppercase" style={{ color: \'#92400E\' }}>{t(\'admin:kpiPending\')}</span>'
    )
    content = content.replace(
        '<div className="small text-muted mt-auto pt-1">Awaiting triage/verification</div>',
        '<div className="small text-muted mt-auto pt-1">{t(\'admin:kpiPendingDesc\')}</div>'
    )

    content = content.replace(
        '<span className="text-primary small fw-bold text-uppercase" style={{ color: \'#3730A3\' }}>\n                  In Progress\n                </span>',
        '<span className="text-primary small fw-bold text-uppercase" style={{ color: \'#3730A3\' }}>{t(\'admin:kpiInProgress\')}</span>'
    )
    content = content.replace(
        '<div className="small text-muted mt-auto pt-1">Responders actively deployed</div>',
        '<div className="small text-muted mt-auto pt-1">{t(\'admin:kpiInProgressDesc\')}</div>'
    )

    content = content.replace(
        '<span className="text-success small fw-bold text-uppercase">Resolved</span>',
        '<span className="text-success small fw-bold text-uppercase">{t(\'admin:kpiResolved\')}</span>'
    )
    content = content.replace(
        '<div className="small text-success opacity-75 mt-auto pt-1">Cleared & secured</div>',
        '<div className="small text-success opacity-75 mt-auto pt-1">{t(\'admin:kpiResolvedDesc\')}</div>'
    )

    # 5. Chart Titles
    content = content.replace(
        '<h6 className="fw-bold text-dark mb-3">Incidents by Emergency Category</h6>',
        '<h6 className="fw-bold text-dark mb-3">{t(\'admin:catChartTitle\')}</h6>'
    )
    content = content.replace(
        '<h6 className="fw-bold text-dark mb-3">Severity Breakdown</h6>',
        '<h6 className="fw-bold text-dark mb-3">{t(\'admin:sevChartTitle\')}</h6>'
    )

    # 6. Table Headers
    content = content.replace(
        '<h6 className="fw-bold text-dark mb-0">Latest Emergency Reports</h6>',
        '<h6 className="fw-bold text-dark mb-0">{t(\'admin:latestReports\')}</h6>'
    )
    content = content.replace(
        'View Full Monitor Table →',
        '{t(\'admin:viewFullMonitor\')}'
    )

    old_recent_headers = """                  <tr>
                    <th>Ref ID</th>
                    <th>Incident</th>
                    <th>Category</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Address</th>
                    <th>Actions</th>
                  </tr>"""

    new_recent_headers = """                  <tr>
                    <th>{t('admin:colRefId')}</th>
                    <th>{t('admin:colIncident')}</th>
                    <th>{t('admin:colCategory')}</th>
                    <th>{t('admin:colSeverity')}</th>
                    <th>{t('admin:colStatus')}</th>
                    <th>{t('admin:colAddress')}</th>
                    <th>{t('admin:colActions')}</th>
                  </tr>"""
    content = content.replace(old_recent_headers, new_recent_headers)

    old_mon_headers = """                  <tr>
                    <th>Ref ID</th>
                    <th>Title & Hazard Details</th>
                    <th>Category</th>
                    <th>Location</th>
                    <th>Suggested</th>
                    <th>Confirmed</th>
                    <th>Status</th>
                    <th>Reported</th>
                    <th className="text-end">Actions</th>
                  </tr>"""

    new_mon_headers = """                  <tr>
                    <th>{t('admin:colRefId')}</th>
                    <th>{t('admin:colTitleDetails')}</th>
                    <th>{t('admin:colCategory')}</th>
                    <th>{t('admin:colLocation')}</th>
                    <th>{t('admin:colSuggested')}</th>
                    <th>{t('admin:colConfirmed')}</th>
                    <th>{t('admin:colStatus')}</th>
                    <th>{t('admin:colReported')}</th>
                    <th className="text-end">{t('admin:colActions')}</th>
                  </tr>"""
    content = content.replace(old_mon_headers, new_mon_headers)

    # 7. Filter Dropdowns
    content = content.replace('<option value="ALL">All Categories</option>', '<option value="ALL">{t(\'admin:allCategories\')}</option>')
    content = content.replace('<option value="ALL">All Severities</option>', '<option value="ALL">{t(\'admin:allSeverities\')}</option>')
    content = content.replace('<option value="ALL">All Statuses</option>', '<option value="ALL">{t(\'admin:allStatuses\')}</option>')
    content = content.replace(
        'placeholder="Search ref #, title, keyword or address..."',
        'placeholder={t(\'admin:searchPlaceholder\')}'
    )

    # Filter options
    content = content.replace('<option value="Critical">Critical</option>', '<option value="Critical">{t(\'admin:severityCritical\')}</option>')
    content = content.replace('<option value="High">High</option>', '<option value="High">{t(\'admin:severityHigh\')}</option>')
    content = content.replace('<option value="Medium">Medium</option>', '<option value="Medium">{t(\'admin:severityMedium\')}</option>')
    content = content.replace('<option value="Low">Low</option>', '<option value="Low">{t(\'admin:severityLow\')}</option>')
    content = content.replace('<option value="Pending">Pending</option>', '<option value="Pending">{t(\'admin:statusPending\')}</option>')
    content = content.replace('<option value="In Progress">In Progress</option>', '<option value="In Progress">{t(\'admin:statusInProgress\')}</option>')
    content = content.replace('<option value="Resolved">Resolved</option>', '<option value="Resolved">{t(\'admin:statusResolved\')}</option>')

    # 8. Refresh & Empty State
    content = content.replace(
        '                  <RefreshCw size={12} className="me-1" />\n                  Refresh',
        '                  <RefreshCw size={12} className="me-1" />\n                  {t(\'admin:refresh\')}'
    )
    content = content.replace(
        'No incidents match current filters.',
        '{t(\'admin:noIncidentsMatch\')}'
    )

    # 9. Localized Category, Status & Severity in table rows
    content = content.replace(
        '<td>\n                          <span className="badge bg-light text-dark border">{inc.category}</span>\n                        </td>',
        '<td>\n                          <span className="badge bg-light text-dark border">{getLocalizedCategory(inc.category)}</span>\n                        </td>'
    )
    content = content.replace(
        '<span>{inc.category}</span>',
        '<span>{getLocalizedCategory(inc.category)}</span>'
    )
    content = content.replace(
        '<span className="badge bg-danger mb-2">{selectedIncident.category}</span>',
        '<span className="badge bg-danger mb-2">{getLocalizedCategory(selectedIncident.category)}</span>'
    )

    # 10. Details View Labels
    content = content.replace(
        '<div className="fw-bold small text-dark mb-1">Hazard Description:</div>',
        '<div className="fw-bold small text-dark mb-1">{t(\'admin:hazardDescLabel\')}</div>'
    )
    content = content.replace(
        '<div className="fw-bold text-dark small mb-2">Update Incident Status:</div>',
        '<div className="fw-bold text-dark small mb-2">{t(\'admin:updateStatusLabel\')}</div>'
    )
    content = content.replace(
        '<div className="fw-bold text-dark small mb-2">Confirm or Override Severity:</div>',
        '<div className="fw-bold text-dark small mb-2">{t(\'admin:overrideSeverityLabel\')}</div>'
    )
    content = content.replace(
        '<h6 className="fw-bold text-dark mb-0">Location Coordinates</h6>',
        '<h6 className="fw-bold text-dark mb-0">{t(\'admin:locationCoords\')}</h6>'
    )
    content = content.replace(
        '<h6 className="fw-bold text-dark mb-3">Status Audit History</h6>',
        '<h6 className="fw-bold text-dark mb-3">{t(\'admin:statusAuditHistory\')}</h6>'
    )
    content = content.replace(
        '<h5 className="fw-bold text-dark mb-0">Active Incidents Geographical Distribution</h5>',
        '<h5 className="fw-bold text-dark mb-0">{t(\'admin:geoDistTitle\')}</h5>'
    )
    content = content.replace(
        'Click any incident marker pin to inspect live details or transition status.',
        '{t(\'admin:geoDistDesc\')}'
    )
    content = content.replace(
        '<h5 className="fw-bold text-dark mb-2">Confirm Removal</h5>',
        '<h5 className="fw-bold text-dark mb-2">{t(\'admin:confirmRemovalTitle\')}</h5>'
    )
    content = content.replace(
        '>Delete Incident<',
        '>{t(\'admin:deleteIncidentBtn\')}<'
    )
    content = content.replace(
        '>Cancel<',
        '>{t(\'admin:cancelBtn\')}<'
    )

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated uyra_admin.tsx at", path)
