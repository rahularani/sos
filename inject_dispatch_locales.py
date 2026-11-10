import json

dispatch_dict = {
    "en": {
        "dispatchTitle": "Location-Based Smart Dispatch (Phase 3)",
        "recommendTeams": "Recommended Response Teams",
        "assignTeamBtn": "Dispatch Team",
        "assignedTeamLabel": "Currently Assigned Response Team:",
        "distanceStraightLine": "Calculated Distance (Haversine)",
        "confirmDispatch": "Confirm Dispatch",
        "teamCategory": "Team Capability",
        "noEligibleTeams": "No AVAILABLE response teams currently within category or sector.",
        "activeAssignmentsCount": "Active Dispatches",
        "contactPhoneLabel": "Contact Line",
        "tabPrioritizedQueue": "Prioritized Triage Queue",
        "lifecycleStatusLabel": "Incident Lifecycle Progress:",
    },
    "ta": {
        "dispatchTitle": "இருப்பிடம் சார்ந்த அறிவார்ந்த மீட்புக் குழு ஒதுக்கீடு",
        "recommendTeams": "பரிந்துரைக்கப்பட்ட மீட்புக் குழுக்கள்",
        "assignTeamBtn": "குழுவை அனுப்புக",
        "assignedTeamLabel": "தற்போது நியமிக்கப்பட்ட மீட்புக் குழு:",
        "distanceStraightLine": "கணக்கிடப்பட்ட தூரம் (ஹேவர்சின்)",
        "confirmDispatch": "அனுப்புதலை உறுதிசெய்க",
        "teamCategory": "குழு திறன்",
        "noEligibleTeams": "தற்போது தயார் நிலையில் உள்ள பொருத்தமான மீட்புக் குழுக்கள் இல்லை.",
        "activeAssignmentsCount": "செயலில் உள்ள அனுப்புதல்கள்",
        "contactPhoneLabel": "தொடர்பு எண்",
        "tabPrioritizedQueue": "முன்னுரிமை வரிசை",
        "lifecycleStatusLabel": "நிகழ்வின் நிலை முன்னேற்றம்:",
    },
    "hi": {
        "dispatchTitle": "स्थान-आधारित त्वरित प्रेषण प्रणाली",
        "recommendTeams": "अनुशंसित प्रतिक्रिया दल",
        "assignTeamBtn": "दल रवाना करें",
        "assignedTeamLabel": "वर्तमान में तैनात प्रतिक्रिया दल:",
        "distanceStraightLine": "गणना की गई दूरी (हवेरसिन)",
        "confirmDispatch": "प्रेषण की पुष्टि करें",
        "teamCategory": "दल की क्षमता",
        "noEligibleTeams": "वर्तमान में कोई उपलब्ध प्रतिक्रिया दल मौजूद नहीं है।",
        "activeAssignmentsCount": "सक्रिय प्रेषण",
        "contactPhoneLabel": "संपर्क नंबर",
        "tabPrioritizedQueue": "प्राथमिकता प्राप्त कतार",
        "lifecycleStatusLabel": "घटना जीवनचक्र प्रगति:",
    },
    "te": {
        "dispatchTitle": "స్థాన ఆధారిత సహాయక బృందాల కేటాయింపు",
        "recommendTeams": "సిఫార్సు చేయబడిన సహాయక బృందాలు",
        "assignTeamBtn": "బృందాన్ని పంపండి",
        "assignedTeamLabel": "ప్రస్తుతం కేటాయించిన బృందం:",
        "distanceStraightLine": "లెక్కించిన దూరం (హావర్సిన్)",
        "confirmDispatch": "ధృవీకరించండి",
        "teamCategory": "బృంద సామర్థ్యం",
        "noEligibleTeams": "అందుబాటులో ఉన్న బృందాలు లేవు.",
        "activeAssignmentsCount": "క్రియాశీల కేటాయింపులు",
        "contactPhoneLabel": "సంప్రదింపు నంబర్",
        "tabPrioritizedQueue": "ప్రాధాన్యత క్యూ",
        "lifecycleStatusLabel": "సంఘటన పురోగతి:",
    },
    "kn": {
        "dispatchTitle": "ಸ್ಥಳ ಆಧಾರಿತ ಸ್ಮಾರ್ಟ್ ನಿಯೋಜನೆ",
        "recommendTeams": "ಶಿಫಾರಸು ಮಾಡಲಾದ ಪ್ರತಿಕ್ರಿಯಾ ತಂಡಗಳು",
        "assignTeamBtn": "ತಂಡವನ್ನು ನಿಯೋಜಿಸಿ",
        "assignedTeamLabel": "ಪ್ರಸ್ತುತ ನಿಯೋಜಿಸಲಾದ ತಂಡ:",
        "distanceStraightLine": "ಲೆಕ್ಕಹಾಕಿದ ದೂರ (ಹ್ಯಾವರ್ಸಿನ್)",
        "confirmDispatch": "ದೃಢೀಕರಿಸಿ",
        "teamCategory": "ತಂಡದ ಸಾಮರ್ಥ್ಯ",
        "noEligibleTeams": "ಲಭ್ಯವಿರುವ ಯಾವುದೇ ತಂಡಗಳಿಲ್ಲ.",
        "activeAssignmentsCount": "ಸಕ್ರಿಯ ನಿಯೋಜನೆಗಳು",
        "contactPhoneLabel": "ಸಂಪರ್ಕ ಸಂಖ್ಯೆ",
        "tabPrioritizedQueue": "ಆದ್ಯತೆಯ ಕ್ಯೂ",
        "lifecycleStatusLabel": "ಘಟನೆಯ ಸ್ಥಿತಿಯ ಪ್ರಗತಿ:",
    },
    "ml": {
        "dispatchTitle": "സ്ഥാനാധിഷ്ഠിത റെസ്ക്യൂ ടീം വിന്യാസം",
        "recommendTeams": "ശുപാർശ ചെയ്യുന്ന രക്ഷാപ്രവർത്തക സംഘങ്ങൾ",
        "assignTeamBtn": "ടീമിനെ അയക്കുക",
        "assignedTeamLabel": "നിലവിൽ നിയോഗിച്ച ടീം:",
        "distanceStraightLine": "കണക്കാക്കിയ ദൂരം (ഹാവർസൈൻ)",
        "confirmDispatch": "ഉറപ്പാക്കുക",
        "teamCategory": "ടീം വൈദഗ്ദ്ധ്യം",
        "noEligibleTeams": "ലഭ്യമായ ടീമുകൾ ആരുമില്ല.",
        "activeAssignmentsCount": "സജീവ വിന്യാസങ്ങൾ",
        "contactPhoneLabel": "ബന്ധപ്പെടേണ്ട നമ്പർ",
        "tabPrioritizedQueue": "മുൻഗണനാ ക്യൂ",
        "lifecycleStatusLabel": "സംഭവ പുരോഗതി:",
    }
}

for path in [
    "/Users/rahulr/Desktop/zuvo/sos/admin-frontend/src/i18n/locales.ts",
    "/Users/rahulr/Desktop/sos/admin-frontend/src/i18n/locales.ts"
]:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    parts = content.split("    admin: {")
    new_parts = [parts[0]]
    langs = ["en", "ta", "hi", "te", "kn", "ml"]
    for i, lang in enumerate(langs):
        block = parts[i+1]
        keys = dispatch_dict[lang]
        lines = "\n".join([f"      {k}: {json.dumps(v, ensure_ascii=False)}," for k, v in keys.items()])
        new_parts.append("\n" + lines + "\n" + block)

    content = "    admin: {".join(new_parts)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Injected dispatch keys into", path)
