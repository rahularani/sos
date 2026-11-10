admin_paths = [
    "/Users/rahulr/Desktop/zuvo/sos/admin-frontend/src/uyra_admin.tsx",
    "/Users/rahulr/Desktop/sos/admin-frontend/src/uyra_admin.tsx",
]

dispatch_panel_jsx = """
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
"""

for p in admin_paths:
    with open(p, "r", encoding="utf-8") as f:
        code = f.read()

    # Insert dispatch panel above Status Lifecycle Controller
    target = "{/* Status Lifecycle Controller */}"
    if "PHASE 3 & 4: INTELLIGENT LOCATION-BASED DISPATCH PANEL" not in code and target in code:
        code = code.replace(target, dispatch_panel_jsx + "\n                " + target)

    with open(p, "w", encoding="utf-8") as f:
        f.write(code)
    print("Injected dispatch panel into", p)
