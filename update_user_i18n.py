import re

file_paths = [
    "/Users/rahulr/Desktop/zuvo/sos/user-frontend/src/uyra_user.tsx",
    "/Users/rahulr/Desktop/sos/user-frontend/src/uyra_user.tsx"
]

helper_code = """
  // Helper to translate category names and descriptions for display
  const getCategoryDetails = (catName: string) => {
    switch (catName) {
      case 'Fire Emergency':
        return { name: t('emergency:fire'), desc: t('emergency:fireDesc') };
      case 'Medical Emergency':
        return { name: t('emergency:medical'), desc: t('emergency:medicalDesc') };
      case 'Road Accident':
        return { name: t('emergency:roadAccident'), desc: t('emergency:roadDesc') };
      case 'Building Collapse':
        return { name: t('emergency:buildingCollapse'), desc: t('emergency:buildingDesc') };
      case 'Flood':
        return { name: t('emergency:flood'), desc: t('emergency:floodDesc') };
      case 'Other Emergencies':
        return { name: t('emergency:other'), desc: t('emergency:otherDesc') };
      default:
        return { name: catName, desc: '' };
    }
  };
"""

for path in file_paths:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Insert helper before `const startEmergencyReport =`
    if "const getCategoryDetails =" not in content:
        content = content.replace("  const startEmergencyReport =", helper_code + "\n  const startEmergencyReport =")

    # 2. Translate Urgent Notice Banner
    old_banner = """            <div className="flex-grow-1">
              <div className="fw-bold fs-6">Life Threatening Emergency?</div>
              <div className="text-white-50 small">
                UYRA transmits digital reports to central monitors. For immediate voice dispatch, always dial{' '}
                <strong className="text-white">112</strong> (All Emergency) or{' '}
                <strong className="text-white">108</strong> (Ambulance).
              </div>
            </div>"""

    new_banner = """            <div className="flex-grow-1">
              <div className="fw-bold fs-6">{t('emergency:urgentNoticeTitle')}</div>
              <div className="text-white-50 small">
                {t('emergency:urgentNoticeText')}
              </div>
            </div>"""
    content = content.replace(old_banner, new_banner)

    # 3. Translate Quick Category Grid
    old_cat_grid = """                        <div className="flex-grow-1">
                          <h6 className="fw-bold text-dark mb-1">{cat.name}</h6>
                          <p className="text-muted small mb-0">{cat.shortDesc}</p>
                        </div>"""

    new_cat_grid = """                        <div className="flex-grow-1">
                          <h6 className="fw-bold text-dark mb-1">{getCategoryDetails(cat.name).name}</h6>
                          <p className="text-muted small mb-0">{getCategoryDetails(cat.name).desc}</p>
                        </div>"""
    content = content.replace(old_cat_grid, new_cat_grid)

    # 4. Translate Helpline cards
    old_helplines = """          {/* Emergency Telephone Quick Dial */}
          <div className="card rounded-4 border-0 shadow-sm p-4 bg-white">
            <h6 className="fw-bold text-dark mb-3">Direct Emergency Telephone Helplines</h6>
            <div className="row g-3">
              <div className="col-6 col-md-3">
                <a
                  href="tel:112"
                  className="btn btn-outline-danger w-100 rounded-3 p-3 text-center text-decoration-none"
                >
                  <div className="fw-black fs-4 text-danger">112</div>
                  <div className="small fw-semibold text-dark">National Emergency</div>
                </a>
              </div>
              <div className="col-6 col-md-3">
                <a
                  href="tel:108"
                  className="btn btn-outline-danger w-100 rounded-3 p-3 text-center text-decoration-none"
                >
                  <div className="fw-black fs-4 text-danger">108</div>
                  <div className="small fw-semibold text-dark">Medical & Ambulance</div>
                </a>
              </div>
              <div className="col-6 col-md-3">
                <a
                  href="tel:101"
                  className="btn btn-outline-danger w-100 rounded-3 p-3 text-center text-decoration-none"
                >
                  <div className="fw-black fs-4 text-danger">101</div>
                  <div className="small fw-semibold text-dark">Fire & Rescue</div>
                </a>
              </div>
              <div className="col-6 col-md-3">
                <a
                  href="tel:100"
                  className="btn btn-outline-danger w-100 rounded-3 p-3 text-center text-decoration-none"
                >
                  <div className="fw-black fs-4 text-danger">100</div>
                  <div className="small fw-semibold text-dark">Police Control Room</div>
                </a>
              </div>
            </div>
          </div>"""

    new_helplines = """          {/* Emergency Telephone Quick Dial */}
          <div className="card rounded-4 border-0 shadow-sm p-4 bg-white">
            <h6 className="fw-bold text-dark mb-3">{t('emergency:directHelplinesTitle')}</h6>
            <div className="row g-3">
              <div className="col-6 col-md-3">
                <a
                  href="tel:112"
                  className="btn btn-outline-danger w-100 rounded-3 p-3 text-center text-decoration-none"
                >
                  <div className="fw-black fs-4 text-danger">112</div>
                  <div className="small fw-semibold text-dark">{t('emergency:helpline112')}</div>
                </a>
              </div>
              <div className="col-6 col-md-3">
                <a
                  href="tel:108"
                  className="btn btn-outline-danger w-100 rounded-3 p-3 text-center text-decoration-none"
                >
                  <div className="fw-black fs-4 text-danger">108</div>
                  <div className="small fw-semibold text-dark">{t('emergency:helpline108')}</div>
                </a>
              </div>
              <div className="col-6 col-md-3">
                <a
                  href="tel:101"
                  className="btn btn-outline-danger w-100 rounded-3 p-3 text-center text-decoration-none"
                >
                  <div className="fw-black fs-4 text-danger">101</div>
                  <div className="small fw-semibold text-dark">{t('emergency:helpline101')}</div>
                </a>
              </div>
              <div className="col-6 col-md-3">
                <a
                  href="tel:100"
                  className="btn btn-outline-danger w-100 rounded-3 p-3 text-center text-decoration-none"
                >
                  <div className="fw-black fs-4 text-danger">100</div>
                  <div className="small fw-semibold text-dark">{t('emergency:helpline100')}</div>
                </a>
              </div>
            </div>
          </div>"""
    content = content.replace(old_helplines, new_helplines)

    # 5. Form Category picker label & names
    old_cat_picker = """              {/* Category Picker */}
              <div className="mb-4">
                <label className="form-label fw-bold text-dark">
                  Emergency Category <span className="text-danger">*</span>
                </label>
                <div className="row g-2">
                  {EMERGENCY_CATEGORIES.map((cat) => {
                    const isSelected = formCategory === cat.name;
                    const IconComp = cat.icon;
                    return (
                      <div key={cat.id} className="col-6 col-md-4">
                        <div
                          onClick={() => setFormCategory(cat.name)}
                          className={`p-3 rounded-3 border d-flex align-items-center gap-2 cursor-pointer transition-all ${
                            isSelected ? 'bg-danger text-white border-danger shadow-sm' : 'bg-light text-dark'
                          }`}
                          style={{ cursor: 'pointer' }}
                        >
                          <IconComp size={18} className={isSelected ? 'text-white' : 'text-danger'} />
                          <span className="fw-semibold small">{cat.name}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>"""

    new_cat_picker = """              {/* Category Picker */}
              <div className="mb-4">
                <label className="form-label fw-bold text-dark">
                  {t('emergency:categorySelectLabel')} <span className="text-danger">*</span>
                </label>
                <div className="row g-2">
                  {EMERGENCY_CATEGORIES.map((cat) => {
                    const isSelected = formCategory === cat.name;
                    const IconComp = cat.icon;
                    return (
                      <div key={cat.id} className="col-6 col-md-4">
                        <div
                          onClick={() => setFormCategory(cat.name)}
                          className={`p-3 rounded-3 border d-flex align-items-center gap-2 cursor-pointer transition-all ${
                            isSelected ? 'bg-danger text-white border-danger shadow-sm' : 'bg-light text-dark'
                          }`}
                          style={{ cursor: 'pointer' }}
                        >
                          <IconComp size={18} className={isSelected ? 'text-white' : 'text-danger'} />
                          <span className="fw-semibold small">{getCategoryDetails(cat.name).name}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>"""
    content = content.replace(old_cat_picker, new_cat_picker)

    # 6. Live severity pre-calc card labels
    old_calc = """                    <span className="fw-bold small text-dark">
                      Smart Severity Engine Pre-Calculation:
                    </span>"""
    new_calc = """                    <span className="fw-bold small text-dark">
                      {t('emergency:smartSeverityTitle')}
                    </span>"""
    content = content.replace(old_calc, new_calc)

    # 7. Confirmation category label display
    old_conf_cat = """                <div className="col-6">
                  <span className="text-muted small">{t('emergency:categorySummary')}:</span>
                  <div className="fw-bold text-dark">{submittedIncident.category}</div>
                </div>"""
    new_conf_cat = """                <div className="col-6">
                  <span className="text-muted small">{t('emergency:categorySummary')}:</span>
                  <div className="fw-bold text-dark">{getCategoryDetails(submittedIncident.category).name}</div>
                </div>"""
    content = content.replace(old_conf_cat, new_conf_cat)

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated", path)
