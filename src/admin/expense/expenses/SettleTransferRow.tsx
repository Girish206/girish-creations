import { useState } from "react";
import type { SettlementTransfer } from "../../../api/types";
import CustomButton from "../../dms/components/CustomButton";
import { formatCurrency, INVALID_AMOUNT_MESSAGE, isValidAmount } from "../currency";

export interface SettleTransferRowProps {
  transfer: SettlementTransfer;
  // Shows what's owed with nothing to record: a closed group, or for anyone but
  // the person getting the money.
  readOnly?: boolean;
  onRecord: (amount: string) => Promise<unknown>;
}

// "Ravi pays Asha ₹600", with the amount editable for a partial repayment.
export function SettleTransferRow({ transfer, readOnly = false, onRecord }: SettleTransferRowProps) {
  const owed = (transfer.amountCents / 100).toFixed(2);
  // Null follows what's owed, which changes after a partial repayment.
  const [amount, setAmount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const value = amount ?? owed;

  async function handleRecord() {
    if (!isValidAmount(value)) {
      setError(INVALID_AMOUNT_MESSAGE);
      return;
    }
    // More than this would flip who owes whom, not settle anything.
    if (Math.round(Number(value) * 100) > transfer.amountCents) {
      setError(`Only ${formatCurrency(transfer.amountCents / 100)} is owed here`);
      return;
    }
    setError(null);
    setRecording(true);
    try {
      await onRecord(value);
      setAmount(null);
    } finally {
      setRecording(false);
    }
  }

  return (
    <li>
      <span>
        <strong>{transfer.fromName}</strong> pays <strong>{transfer.toName}</strong>{" "}
        {formatCurrency(transfer.amountCents / 100)}
      </span>
      {!readOnly && (
        <span className="admin-settle-record">
          <input
            type="number"
            className="form-control form-control-sm"
            min="0.01"
            step="0.01"
            aria-label="Amount paid"
            value={value}
            onChange={(e) => {
              setError(null);
              setAmount(e.target.value);
            }}
          />
          <CustomButton
            size="sm"
            className="m-0"
            loading={recording}
            onClick={handleRecord}
            title="Record this repayment"
          >
            Mark paid
          </CustomButton>
          {error && (
            <small className="text-theme-primary w-100" role="alert">
              {error}
            </small>
          )}
        </span>
      )}
    </li>
  );
}
