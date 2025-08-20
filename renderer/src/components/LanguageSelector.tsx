interface LanguageOption {
  value: string;
  label: string;
}

interface LanguageSelectorProps {
  sourceLang: string;
  targetLang: string;
  onSourceLangChange: (lang: string) => void;
  onTargetLangChange: (lang: string) => void;
  onSwitchLanguages: () => void;
  languageOptions: LanguageOption[];
}

export const LanguageSelector = ({
  sourceLang,
  targetLang,
  onSourceLangChange,
  onTargetLangChange,
  onSwitchLanguages,
  languageOptions,
}: LanguageSelectorProps) => {
  return (
    <div className="language-selector-container">
      <select
        className="language-select"
        disabled
        value={sourceLang}
        onChange={(e) => onSourceLangChange(e.target.value)}
      >
        {languageOptions.map((lang) => (
          <option key={`source-${lang.value}`} value={lang.value}>
            {lang.label}
          </option>
        ))}
      </select>
      <button
        className="switch-lang-button"
        onClick={onSwitchLanguages}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
          />
        </svg>
      </button>
      <select
        className="language-select"
        value={targetLang}
        onChange={(e) => onTargetLangChange(e.target.value)}
      >
        {languageOptions
          .filter((lang) => lang.value !== "auto")
          .map((lang) => (
            <option key={`target-${lang.value}`} value={lang.value}>
              {lang.label}
            </option>
          ))}
      </select>
    </div>
  );
};
