import { FC, useState } from "react";

export interface NewPoolInput {
  question: string;
  outcomeNames: string[];
  hoursUntilClose: number;
}

interface Props {
  onClose: () => void;
  onSubmit: (input: NewPoolInput) => Promise<void>;
  creationFeeSol?: number;
}

const MIN_OUTCOMES = 2;
const MAX_OUTCOMES = 8;

export const CreatePoolModal: FC<Props> = ({ onClose, onSubmit, creationFeeSol }) => {
  const [question, setQuestion] = useState("");
  const [outcomes, setOutcomes] = useState<string[]>(["Yes", "No"]);
  const [hours, setHours] = useState("24");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateOutcome(index: number, value: string) {
    setOutcomes((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  function addOutcome() {
    if (outcomes.length >= MAX_OUTCOMES) return;
    setOutcomes((prev) => [...prev, ""]);
  }

  function removeOutcome(index: number) {
    if (outcomes.length <= MIN_OUTCOMES) return;
    setOutcomes((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (question.trim().length === 0) {
      setError("Add a question first.");
      return;
    }
    const cleanedOutcomes = outcomes.map((o) => o.trim()).filter((o) => o.length > 0);
    if (cleanedOutcomes.length < MIN_OUTCOMES) {
      setError(`Add at least ${MIN_OUTCOMES} outcome labels.`);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onSubmit({
        question: question.trim(),
        outcomeNames: cleanedOutcomes,
        hoursUntilClose: parseFloat(hours) || 24,
      });
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong creating the pool.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-x" onClick={onClose} aria-label="Close">
          &times;
        </button>
        <h3>Create a pool</h3>

        <div className="field">
          <label htmlFor="question">Question</label>
          <input
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Who wins the 2027 election?"
          />
        </div>

        <div className="field">
          <label>Outcomes (2-8)</label>
          {outcomes.map((outcome, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input
                value={outcome}
                onChange={(e) => updateOutcome(i, e.target.value)}
                placeholder={`Outcome ${i + 1}`}
                style={{ flex: 1 }}
              />
              {outcomes.length > MIN_OUTCOMES && (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: "0 14px" }}
                  onClick={() => removeOutcome(i)}
                >
                  &minus;
                </button>
              )}
            </div>
          ))}
          {outcomes.length < MAX_OUTCOMES && (
            <button type="button" className="btn-secondary" style={{ width: "100%" }} onClick={addOutcome}>
              + Add outcome
            </button>
          )}
        </div>

        <div className="field">
          <label htmlFor="hours">Betting closes in (hours)</label>
          <input
            id="hours"
            type="number"
            min="1"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
        </div>

        {creationFeeSol !== undefined && creationFeeSol > 0 && (
          <p style={{ color: "var(--muted)", fontSize: 12, fontFamily: "var(--font-mono)", marginBottom: 12 }}>
            Creating a pool costs {creationFeeSol} SOL, paid to the platform (deters spam).
          </p>
        )}

        {error && (
          <p style={{ color: "var(--coral)", fontSize: 13, marginBottom: 12 }}>{error}</p>
        )}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSubmit} disabled={busy}>
            {busy ? "Creating..." : "Create pool"}
          </button>
        </div>
      </div>
    </div>
  );
};
