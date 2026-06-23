import React, { useState } from 'react';

export default function OtpModal({ open, onClose, otpId, walletId, to, amount, onConfirmed }) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  if (!open) return null;
  const submit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/planner/wallets/${walletId}/confirm-deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}) },
        body: JSON.stringify({ otpId, otp: pin })
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) return alert(data.message || 'Failed to confirm OTP');
      onConfirmed && onConfirmed(data);
      onClose && onClose();
    } catch (err) {
      setLoading(false);
      console.error(err);
      alert('Network error while confirming OTP');
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
      <div style={{ width: 380, maxWidth: '95%', background: 'white', borderRadius: 12, padding: 18 }}>
        <h3 style={{ margin: 0 }}>Enter PIN</h3>
        <div style={{ marginTop: 10, color: '#374151' }}>A PIN was sent via M-Pesa to <strong>{to}</strong> for the deposit of <strong>{amount}</strong>.</div>
        <input value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Enter PIN" style={{ marginTop: 12, padding: 10, width: '100%', borderRadius: 8, border: '1px solid #d1d5db' }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button onClick={onClose} style={{ padding: '8px 12px', borderRadius: 8, background: '#f3f4f6', border: 'none' }}>Cancel</button>
          <button onClick={submit} disabled={loading} style={{ padding: '8px 12px', borderRadius: 8, background: '#10b981', color: 'white', border: 'none' }}>{loading ? 'Confirming...' : 'Confirm'}</button>
        </div>
      </div>
    </div>
  );
}
