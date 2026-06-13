import React, { useEffect, useState } from "react";
import axios from "axios";

interface AISettings {
  use_ai: boolean;
  api_key: string;
  api_key_set: boolean;
  model_name: string;
  system_prompt: string;
}

interface AIConfigModalProps {
  onClose: () => void;
  onSaved: () => void;
}

const DEFAULT_PROMPT =
  "You are an expert chef and demand-forecasting assistant for a ghost kitchen. " +
  "Predict the daily order quantity for each menu item based on historical sales trends, " +
  "temperature, weather conditions, whether it is a weekend, and local events. " +
  "Be concise and accurate. Only output the JSON object — no explanation needed.";

const GEMINI_MODELS = [
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-2.0-flash",
  "gemini-2.5-flash-preview-05-20",
  "gemini-2.5-pro-preview-06-05",
];

const AIConfigModal: React.FC<AIConfigModalProps> = ({ onClose, onSaved }) => {
  const [settings, setSettings] = useState<AISettings>({
    use_ai: false,
    api_key: "",
    api_key_set: false,
    model_name: "gemini-1.5-flash",
    system_prompt: DEFAULT_PROMPT,
  });
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get<AISettings>("http://localhost:8000/api/settings")
      .then(({ data }) => {
        setSettings((prev) => ({
          ...prev,
          ...data,
          // Keep blank if key is masked
          api_key: "",
        }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg("");
    try {
      await axios.post("http://localhost:8000/api/settings", {
        use_ai: settings.use_ai,
        api_key: settings.api_key, // empty = keep existing on backend
        model_name: settings.model_name,
        system_prompt: settings.system_prompt,
      });
      setSaveMsg("✅ Settings saved successfully!");
      setTimeout(() => {
        onSaved();
        onClose();
      }, 800);
    } catch {
      setSaveMsg("❌ Failed to save settings. Is the backend running?");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <p className="eyebrow" style={{ margin: 0, fontSize: "0.75rem" }}>
              AI Integration
            </p>
            <h2 style={{ margin: 0, fontSize: "1.4rem" }}>⚙️ Configure AI Forecasting</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {loading ? (
          <div className="modal-body" style={{ textAlign: "center", padding: "40px" }}>
            <div className="spinner" />
            <p style={{ color: "#93c5fd", marginTop: 12 }}>Loading settings…</p>
          </div>
        ) : (
          <div className="modal-body">
            {/* Enable toggle */}
            <div className="config-row">
              <div>
                <label className="config-label">Enable AI Predictions</label>
                <p className="config-hint">
                  Use Google Gemini to forecast instead of the local ML model.
                </p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.use_ai}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, use_ai: e.target.checked }))
                  }
                />
                <span className="toggle-thumb" />
              </label>
            </div>

            {/* API Key */}
            <div className="config-field">
              <label className="config-label">
                Gemini API Key
                {settings.api_key_set && (
                  <span className="key-set-badge">● Key saved</span>
                )}
              </label>
              <div className="key-input-row">
                <input
                  type={showKey ? "text" : "password"}
                  className="config-input"
                  placeholder={
                    settings.api_key_set
                      ? "Enter new key to replace the saved one"
                      : "Paste your Google AI Studio API key"
                  }
                  value={settings.api_key}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, api_key: e.target.value }))
                  }
                />
                <button
                  className="show-key-btn"
                  onClick={() => setShowKey((v) => !v)}
                >
                  {showKey ? "Hide" : "Show"}
                </button>
              </div>
              <p className="config-hint">
                Get your key at{" "}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#93c5fd" }}
                >
                  aistudio.google.com/apikey
                </a>
              </p>
            </div>

            {/* Model selection */}
            <div className="config-field">
              <label className="config-label">Gemini Model</label>
              <select
                className="config-input"
                value={settings.model_name}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, model_name: e.target.value }))
                }
              >
                {GEMINI_MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* System Prompt */}
            <div className="config-field">
              <label className="config-label">System Prompt</label>
              <p className="config-hint">
                Describe your kitchen context. The AI will use this to tailor its predictions.
              </p>
              <textarea
                className="config-input config-textarea"
                rows={5}
                value={settings.system_prompt}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, system_prompt: e.target.value }))
                }
                placeholder="e.g. We run a high-volume beachside food truck…"
              />
            </div>

            {/* Fixed schema note */}
            <div className="config-fixed-note">
              <span className="lock-icon">🔒</span>
              <div>
                <strong>Output format is enforced automatically.</strong>
                <p style={{ margin: "4px 0 0", fontSize: "0.8rem", opacity: 0.75 }}>
                  A strict JSON schema instruction is always appended to the prompt so
                  predictions stay compatible with the dashboard UI. This portion is
                  not editable.
                </p>
              </div>
            </div>

            {/* Actions */}
            {saveMsg && (
              <p
                style={{
                  textAlign: "center",
                  color: saveMsg.startsWith("✅") ? "#4ade80" : "#f87171",
                  marginBottom: 0,
                }}
              >
                {saveMsg}
              </p>
            )}
            <div className="modal-actions">
              <button className="modal-cancel-btn" onClick={onClose}>
                Cancel
              </button>
              <button
                className="modal-save-btn"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save Settings"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIConfigModal;
