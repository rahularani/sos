const { translations } = require('./user-frontend/src/i18n/locales.ts');
const { adminTranslations } = require('./admin-frontend/src/i18n/locales.ts');

console.log('================================================================');
console.log('🌐 UYRA MULTILINGUAL SUPPORT VERIFICATION SUITE');
console.log('================================================================\n');

const LANGUAGES = ['en', 'ta', 'hi', 'te', 'kn', 'ml'];
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

// 1. Language Coverage Tests
console.log('Test Suite 1: Six Language Coverage (User SOS Portal)');
LANGUAGES.forEach((lang) => {
  const hasLang = !!translations[lang];
  assert(hasLang, `Language '${lang}' bundle exists in user-frontend`);
  if (hasLang) {
    const commonKeys = Object.keys(translations[lang].common || {}).length;
    const emergencyKeys = Object.keys(translations[lang].emergency || {}).length;
    const authKeys = Object.keys(translations[lang].auth || {}).length;
    assert(commonKeys >= 15, `Language '${lang}' has >= 15 common keys (found ${commonKeys})`);
    assert(emergencyKeys >= 40, `Language '${lang}' has >= 40 emergency keys (found ${emergencyKeys})`);
    assert(authKeys >= 25, `Language '${lang}' has >= 25 auth keys (found ${authKeys})`);
  }
});

// 2. Admin Command Center Coverage
console.log('\nTest Suite 2: Six Language Coverage (Admin Command Center)');
LANGUAGES.forEach((lang) => {
  const hasLang = !!adminTranslations[lang];
  assert(hasLang, `Language '${lang}' bundle exists in admin-frontend`);
  if (hasLang) {
    const adminKeys = Object.keys(adminTranslations[lang].admin || {}).length;
    assert(adminKeys >= 25, `Admin language '${lang}' has >= 25 admin keys (found ${adminKeys})`);
  }
});

// 3. Terminology Consistency Tests
console.log('\nTest Suite 3: Critical Emergency Terminology Verification');
const sampleKeywords = ['fire', 'medical', 'roadAccident', 'buildingCollapse', 'flood', 'tapToReport', 'transmitSosNow'];
LANGUAGES.forEach((lang) => {
  const allPresent = sampleKeywords.every(k => !!translations[lang]?.emergency?.[k]);
  assert(allPresent, `Language '${lang}' includes all critical emergency hazard terminologies`);
});

// 4. Unicode & Native Script Rendering Tests
console.log('\nTest Suite 4: Native Scripts Validation');
assert(translations.ta.common.appName.includes('உய்ரா'), 'Tamil script rendered properly (உய்ரா)');
assert(translations.hi.common.appName.includes('उयरा'), 'Hindi Devanagari script rendered properly (उयरा)');
assert(translations.te.common.appName.includes('ఉయ్రా'), 'Telugu script rendered properly (ఉయ్రా)');
assert(translations.kn.common.appName.includes('ಉಯ್ರಾ'), 'Kannada script rendered properly (ಉಯ್ರಾ)');
assert(translations.ml.common.appName.includes('ഉയ്റ'), 'Malayalam script rendered properly (ഉയ്റ)');

console.log('\n================================================================');
console.log(`📊 MULTILINGUAL TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
console.log('================================================================\n');

process.exit(failed > 0 ? 1 : 0);
