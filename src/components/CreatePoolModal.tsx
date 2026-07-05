import { FC, useState } from "react";

export interface NewPoolInput {
  question: string;
  yesLabel: string;
  noLabel: string;
  hoursUntilClose: number;
}

interface Props {
  onClose: () => void;
  onSubmit: (input: NewPoolInput) => Promise<void>;
}

export const CreatePoolModal: FC<Props> = ({ onClose, onSubmit }) => {
  const [question, setQuestion] = useState("");
  const [yesLabel, setYesLabel] = useState("Yes");
  const [noLabel, setNoLabel] = useState("No");
  const [hours, setHours] = useState("24");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (question.trim().length === 0) {
      setError("Add a question first.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onSubmit({
        question: question.trim(),
        yesLabel: yesLabel.trim() || "Yes",
        noLabel: noLabel.trim() || "No",
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
            placeholder="Will Tinubu address the nation today?"
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="yes">Yes label</label>
            <input id="yes" value={yesLabel} onChange={(e) => setYesLabel(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="no">No label</label>
            <input id="no" value={noLabel} onChange={(e) => setNoLabel(e.target.value)} />
          </div>
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
