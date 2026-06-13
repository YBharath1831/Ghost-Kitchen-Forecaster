import React, { useState, useRef, useCallback } from "react";
import axios from "axios";

interface ParsedRow {
  date: string;
  day_of_week: string;
  is_weekend: string;
  temperature: string;
  weather_condition: string;
  local_event: string;
  [key: string]: string;
}

interface TrainResult {
  metrics: Record<string, number>;
  rows_trained: number;
  message: string;
}

interface CustomDataPageProps {
  onBack: () => void;
}

const COLUMN_GUIDE = [
  { name: "date", type: "YYYY-MM-DD", example: "2026-01-15", desc: "Calendar date of the sales record" },
  { name: "day_of_week", type: "Text", example: "Friday", desc: "Full day name (Monday to Sunday)" },
  { name: "is_weekend", type: "0 or 1", example: "1", desc: "1 if Fri/Sat/Sun, 0 otherwise" },
  { name: "temperature", type: "Number", example: "24.5", desc: "Temperature in °C (-20 to 60)" },
  { name: "weather_condition", type: "Enum", example: "Sunny", desc: "One of: Sunny, Cloudy, Rainy, Stormy" },
  { name: "local_event", type: "0 or 1", example: "0", desc: "1 if a local event occurred, 0 otherwise" },
  { name: "(Any Item)", type: "Integer", example: "72", desc: "Any additional columns will be treated as menu items to predict." },
];

function parseCsvText(text: string): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim());
  return lines.slice(1, 11).map(line => {
    const values = line.split(",").map(v => v.trim());
    const row: ParsedRow = {} as ParsedRow;
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
    return row;
  });
}

const CustomDataPage: React.FC<CustomDataPageProps> = ({ onBack }) => {
  const [isDraggingCsv, setIsDraggingCsv] = useState(false);
  const [isDraggingJson, setIsDraggingJson] = useState(false);

  const [selectedCsvFile, setSelectedCsvFile] = useState<File | null>(null);
  const [selectedRecipesFile, setSelectedRecipesFile] = useState<File | null>(null);

  const [previewRows, setPreviewRows] = useState<ParsedRow[]>([]);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "uploaded" | "error">("idle");
  const [trainStatus, setTrainStatus] = useState<"idle" | "training" | "success" | "error">("idle");

  const [uploadMessage, setUploadMessage] = useState("");
  const [trainResult, setTrainResult] = useState<TrainResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const csvInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const handleCsvFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setErrorMessage("Please upload a .csv file for sales data.");
      setUploadStatus("error");
      return;
    }
    setSelectedCsvFile(file);
    setErrorMessage("");
    setUploadStatus("idle");
    setTrainStatus("idle");
    setTrainResult(null);

    const text = await file.text();
    setPreviewRows(parseCsvText(text));
  }, []);

  const handleJsonFile = useCallback((file: File) => {
    if (!file.name.endsWith(".json")) {
      setErrorMessage("Please upload a .json file for recipes.");
      setUploadStatus("error");
      return;
    }
    setSelectedRecipesFile(file);
    setErrorMessage("");
    setUploadStatus("idle");
    setTrainStatus("idle");
    setTrainResult(null);
  }, []);

  const handleDropCsv = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingCsv(false);
    const file = e.dataTransfer.files[0];
    if (file) handleCsvFile(file);
  }, [handleCsvFile]);

  const handleDropJson = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingJson(false);
    const file = e.dataTransfer.files[0];
    if (file) handleJsonFile(file);
  }, [handleJsonFile]);

  const handleUploadAndTrain = async () => {
    if (!selectedCsvFile || !selectedRecipesFile) return;

    // Step 1: Upload
    setUploadStatus("uploading");
    setErrorMessage("");
    try {
      const formData = new FormData();
      formData.append("csv_file", selectedCsvFile);
      formData.append("recipes_file", selectedRecipesFile);

      const { data } = await axios.post<{ rows_saved: number; items: string[]; message: string }>(
        "http://localhost:8000/api/upload-data",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setUploadMessage(data.message);
      setUploadStatus("uploaded");
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? "Upload failed. Please check the file formats.";
      setErrorMessage(detail);
      setUploadStatus("error");
      return;
    }

    // Step 2: Retrain
    setTrainStatus("training");
    try {
      const { data } = await axios.post<TrainResult>("http://localhost:8000/api/retrain");
      setTrainResult(data);
      setTrainStatus("success");
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? "Training failed unexpectedly.";
      setErrorMessage(detail);
      setTrainStatus("error");
    }
  };

  /** Fetch the file from Vite's static server and save it via a Blob URL.
   *  This is the most reliable cross-browser approach – avoids Content-Type
   *  header issues and the browser's "open in tab" behaviour for CSV/JSON. */
  const downloadFile = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      alert(`Could not download ${filename}. Make sure the dev server is running.`);
    }
  };

  const isProcessing = uploadStatus === "uploading" || trainStatus === "training";
  const isSuccess = trainStatus === "success";

  return (
    <div className="custom-page-shell">
      <header className="custom-page-header">
        <button className="back-button" onClick={onBack} disabled={isProcessing}>
          ← Back to Dashboard
        </button>
        <div className="custom-page-title">
          <p className="eyebrow">Kitchen Customisation</p>
          <h1>Train the Model on Your Data</h1>
        </div>
      </header>

      <div className="custom-page-grid">

        <div className="custom-left-col">
          <div className="guide-card">
            <div className="card-header">
              <h2>📋 CSV Format Guide</h2>
              <p>Your sales file must follow this exact format. You can add any number of additional columns for your specific menu items.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => downloadFile('/ghost_kitchen_template.csv', 'ghost_kitchen_template.csv')}
                className="template-download-btn"
              >
                ⬇ Download CSV Template
              </button>
              <button
                onClick={() => downloadFile('/ghost_kitchen_recipes_template.json', 'ghost_kitchen_recipes_template.json')}
                className="template-download-btn"
              >
                ⬇ Download Recipes JSON
              </button>
            </div>
            <div className="column-guide-table">
              <div className="col-guide-header">
                <span>Column</span>
                <span>Type</span>
                <span>Example</span>
                <span>Description</span>
              </div>
              {COLUMN_GUIDE.map(col => (
                <div key={col.name} className="col-guide-row">
                  <code className="col-name">{col.name}</code>
                  <span className="col-type">{col.type}</span>
                  <code className="col-example">{col.example}</code>
                  <span className="col-desc">{col.desc}</span>
                </div>
              ))}
            </div>
            <div className="guide-notes">
              <p>⚠️ Minimum <strong>30 rows</strong> required for the model to train effectively.</p>
              <p>ℹ️ **Important:** You must also upload a `recipes.json` file. Every menu item column in your CSV must have a corresponding key in the JSON file.</p>
            </div>
          </div>
        </div>

        <div className="custom-right-col">

          {/* Upload Zones Container */}
          <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr 1fr' }}>

            {/* CSV Upload Zone */}
            <div
              className={`upload-zone ${isDraggingCsv ? "dragging" : ""} ${selectedCsvFile ? "has-file" : ""}`}
              onDragOver={e => { e.preventDefault(); setIsDraggingCsv(true); }}
              onDragLeave={() => setIsDraggingCsv(false)}
              onDrop={handleDropCsv}
              onClick={() => !isProcessing && csvInputRef.current?.click()}
            >
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                style={{ display: "none" }}
                onChange={e => e.target.files?.[0] && handleCsvFile(e.target.files[0])}
              />
              {selectedCsvFile ? (
                <div className="upload-zone-content">
                  <div className="file-icon">📄</div>
                  <p className="file-name">{selectedCsvFile.name}</p>
                  <p className="file-size">{(selectedCsvFile.size / 1024).toFixed(1)} KB</p>
                  {!isProcessing && <span className="change-file-hint">Click to change</span>}
                </div>
              ) : (
                <div className="upload-zone-content">
                  <div className="upload-icon">📊</div>
                  <p className="upload-prompt">Sales Data CSV</p>
                  <p className="upload-subtext">Drop or click</p>
                </div>
              )}
            </div>

            {/* JSON Upload Zone */}
            <div
              className={`upload-zone ${isDraggingJson ? "dragging" : ""} ${selectedRecipesFile ? "has-file" : ""}`}
              onDragOver={e => { e.preventDefault(); setIsDraggingJson(true); }}
              onDragLeave={() => setIsDraggingJson(false)}
              onDrop={handleDropJson}
              onClick={() => !isProcessing && jsonInputRef.current?.click()}
            >
              <input
                ref={jsonInputRef}
                type="file"
                accept=".json"
                style={{ display: "none" }}
                onChange={e => e.target.files?.[0] && handleJsonFile(e.target.files[0])}
              />
              {selectedRecipesFile ? (
                <div className="upload-zone-content">
                  <div className="file-icon">📦</div>
                  <p className="file-name">{selectedRecipesFile.name}</p>
                  <p className="file-size">{(selectedRecipesFile.size / 1024).toFixed(1)} KB</p>
                  {!isProcessing && <span className="change-file-hint">Click to change</span>}
                </div>
              ) : (
                <div className="upload-zone-content">
                  <div className="upload-icon">📝</div>
                  <p className="upload-prompt">Recipes JSON</p>
                  <p className="upload-subtext">Drop or click</p>
                </div>
              )}
            </div>

          </div>

          {errorMessage && (
            <div className="status-alert error-alert">
              <span>⚠️</span>
              <p>{errorMessage}</p>
            </div>
          )}

          {uploadStatus === "uploaded" && !errorMessage && (
            <div className="status-alert success-alert">
              <span>✓</span>
              <p>{uploadMessage}</p>
            </div>
          )}

          {previewRows.length > 0 && (
            <div className="preview-card">
              <div className="card-header">
                <h2>👁 Data Preview <span className="preview-note">(first {previewRows.length} rows)</span></h2>
                <p>Verify your data looks correct before training.</p>
              </div>
              <div className="preview-table-wrap">
                <table className="preview-table">
                  <thead>
                    <tr>
                      {Object.keys(previewRows[0]).map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((val, j) => (
                          <td key={j}>{val}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedCsvFile && selectedRecipesFile && !isSuccess && (
            <button
              className={`train-button ${isProcessing ? "processing" : ""}`}
              onClick={handleUploadAndTrain}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <span className="spinner" />
                  {uploadStatus === "uploading" ? "Validating & uploading data…" : "Training model on your data…"}
                </>
              ) : (
                <>🚀 Train My Kitchen Model</>
              )}
            </button>
          )}

          {/* Keep the train button slightly visible but disabled if they haven't uploaded both files */}
          {(!selectedCsvFile || !selectedRecipesFile) && !isSuccess && (
            <button
              className="train-button processing"
              disabled={true}
              style={{ opacity: 0.5, cursor: "not-allowed" }}
            >
              ⚠️ Please upload both Sales CSV and Recipes JSON
            </button>
          )}

          {isProcessing && (
            <div className="training-steps">
              <div className={`training-step ${uploadStatus === "uploading" ? "active" : uploadStatus === "uploaded" ? "done" : ""}`}>
                <span className="step-icon">{uploadStatus === "uploaded" ? "✓" : uploadStatus === "uploading" ? "⟳" : "○"}</span>
                <span>Validating & saving your data</span>
              </div>
              <div className="step-connector" />
              <div className={`training-step ${trainStatus === "training" ? "active" : trainStatus === "success" ? "done" : ""}`}>
                <span className="step-icon">{trainStatus === "success" ? "✓" : trainStatus === "training" ? "⟳" : "○"}</span>
                <span>Training ML model on your data</span>
              </div>
              <div className="step-connector" />
              <div className={`training-step ${trainStatus === "success" ? "done" : ""}`}>
                <span className="step-icon">{trainStatus === "success" ? "✓" : "○"}</span>
                <span>Hot-reloading model into forecaster</span>
              </div>
            </div>
          )}

          {isSuccess && trainResult && (
            <div className="success-panel">
              <div className="success-header">
                <div className="success-icon">✨</div>
                <div>
                  <h2>Your Kitchen Model is Ready!</h2>
                  <p>{trainResult.message}</p>
                </div>
              </div>
              <div className="success-metrics">
                <p className="success-metrics-label">New Model Validation Accuracy (Mean Absolute Error):</p>
                <div className="success-metrics-grid">
                  {Object.entries(trainResult.metrics).map(([item, mae]) => (
                    <div key={item} className="success-metric-tile">
                      <span>{item}</span>
                      <strong>MAE: {mae.toFixed(2)}</strong>
                    </div>
                  ))}
                </div>
                <p className="trained-on">Trained on <strong>{trainResult.rows_trained} rows</strong> of your kitchen data.</p>
              </div>
              <button className="back-to-dash-btn" onClick={onBack}>
                ← Go to Dashboard & See My Forecast
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomDataPage;
