import React, { useEffect, useState } from 'react';

const formatSavedAccount = (account) => account?.name || '';

export default function DepositModal({
  open,
  walletName,
  currency = 'KES',
  accounts = [],
  initialAmount = '',
  onClose,
  onSubmit,
}) {
  const [selectedAccountId, setSelectedAccountId] = useState('other');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState(initialAmount ? String(initialAmount) : '');
  const [savePhone, setSavePhone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    // default to entering a phone number so users can input their own M-Pesa number
    setSelectedAccountId('other');
    setPhone('');
    setAmount(initialAmount ? String(initialAmount) : '');
    setSavePhone(false);
    setError('');
  }, [open, accounts, initialAmount]);

  if (!open) return null;

  const useSavedAccount = selectedAccountId !== 'other';
  const selectedAccount = accounts.find((acc) => String(acc.id) === selectedAccountId);
  const destination = useSavedAccount ? selectedAccount?.name || phone : phone;

  const handleSubmit = () => {
    const normalizedPhone = destination.trim();
    const numericAmount = parseFloat(amount);

    if (!normalizedPhone) {
      setError('Enter a valid phone number or receiver.');
      return;
    }

    if (!numericAmount || numericAmount <= 0) {
      setError('Enter a valid deposit amount.');
      return;
    }

    setError('');
    onSubmit({ to: normalizedPhone, amount: numericAmount, saveAccount: !useSavedAccount && savePhone });
  };

  const handleAccountChange = (value) => {
    setSelectedAccountId(value);
    if (value === 'other') {
      setPhone('');
      return;
    }
    const account = accounts.find((acc) => String(acc.id) === value);
    if (account) {
      setPhone(account.name);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
      <div style={{ width: 420, maxWidth: '95%', background: 'white', borderRadius: 14, padding: 22, boxShadow: '0 20px 60px rgba(15,23,42,0.25)' }}>
        <h3 style={{ margin: 0, fontSize: '20px' }}>Deposit to {walletName}</h3>
        <p style={{ margin: '10px 0 16px', color: '#4b5563' }}>
          Enter the phone number that will receive the M-Pesa STK push and the amount to deposit into this wallet.
        </p>

        {accounts.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: '13px', fontWeight: 700, color: '#374151' }}>Saved deposit phones</label>
            <select
              value={selectedAccountId}
              onChange={(e) => handleAccountChange(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #d1d5db', background: '#f9fafb' }}
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={String(acc.id)}>{formatSavedAccount(acc)}</option>
              ))}
              <option value="other">Other phone number</option>
            </select>
          </div>
        )}

        {selectedAccountId === 'other' && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: '13px', fontWeight: 700, color: '#374151' }}>Phone number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +254712345678"
              style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #d1d5db' }}
            />
            <div style={{ marginTop: 8, fontSize: '12px', color: '#6b7280' }}>
              This should be your mobile number for M-Pesa STK push approval, not the app wallet ID.
            </div>
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: '13px', fontWeight: 700, color: '#374151' }}>Amount ({currency})</label>
          <input
            type="number"
            min="0"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #d1d5db' }}
          />
        </div>

        {selectedAccountId === 'other' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, color: '#4b5563' }}>
            <input type="checkbox" checked={savePhone} onChange={(e) => setSavePhone(e.target.checked)} />
            Save this phone as a receiver for future deposits
          </label>
        )}

        {error && <div style={{ marginBottom: 12, color: '#b91c1c', fontSize: '13px' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button onClick={onClose} style={{ padding: '10px 14px', borderRadius: 10, background: '#e5e7eb', border: 'none', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSubmit} style={{ padding: '10px 14px', borderRadius: 10, background: '#2563eb', color: 'white', border: 'none', cursor: 'pointer' }}>Send M-Pesa push</button>
        </div>
      </div>
    </div>
  );
}
