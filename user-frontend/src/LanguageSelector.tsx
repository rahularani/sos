import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';
import { SUPPORTED_LANGUAGES, STORAGE_KEY } from './i18n/languages';

interface LanguageSelectorProps {
  className?: string;
  variant?: 'pill' | 'dropdown' | 'compact';
}

export function LanguageSelector({ className = '', variant = 'pill' }: LanguageSelectorProps) {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang =
    SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) ||
    SUPPORTED_LANGUAGES.find((l) => i18n.language && i18n.language.startsWith(l.code)) ||
    SUPPORTED_LANGUAGES[0];

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem(STORAGE_KEY, code);
    setIsOpen(false);

    // Prepare for future backend persistence when user profile endpoint is available
    const token = localStorage.getItem('uyra_citizen_token');
    if (token) {
      console.log(`[i18n] Language preference '${code}' saved locally. Ready for future PATCH /api/users/profile { preferredLanguage: '${code}' }`);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`position-relative d-inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-outline-secondary btn-sm rounded-pill px-2 py-1 d-flex align-items-center gap-1 bg-white shadow-sm"
        style={{ fontSize: '0.8rem', border: '1px solid #CBD5E1' }}
        aria-label="Select Language"
        title="Change Language"
      >
        <Globe size={14} className="text-danger" />
        <span className="fw-bold text-dark">{currentLang.nativeName}</span>
      </button>

      {isOpen && (
        <div
          className="position-absolute end-0 mt-1 py-1 bg-white rounded-3 shadow-lg border"
          style={{
            zIndex: 1070,
            minWidth: 160,
            animation: 'fadeIn 0.15s ease-in-out',
          }}
        >
          <div className="px-3 py-1 border-bottom small text-muted fw-bold" style={{ fontSize: '0.7rem' }}>
            Choose Language / மொழி
          </div>
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = lang.code === currentLang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleLanguageChange(lang.code)}
                className={`dropdown-item d-flex align-items-center justify-content-between px-3 py-2 text-start w-100 btn btn-link text-decoration-none ${
                  isSelected ? 'bg-light text-danger fw-bold' : 'text-dark'
                }`}
                style={{ fontSize: '0.82rem' }}
              >
                <span>
                  <span className="me-2">{lang.nativeName}</span>
                  <span className="text-muted small" style={{ fontSize: '0.72rem' }}>
                    ({lang.name})
                  </span>
                </span>
                {isSelected && <Check size={14} className="text-danger" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
