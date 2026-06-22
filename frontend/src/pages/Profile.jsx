import React, {useEffect, useState} from 'react';
import { userApi } from '../api';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState('Kenya');
  const [currency, setCurrency] = useState('KES');
  const [message, setMessage] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await userApi.getProfile();
        setProfile(res.data);
        setCountry(res.data?.country || 'Kenya');
        setCurrency(res.data?.currency || 'KES');
      } catch (err) {
        console.error('Failed to load profile', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    try {
      const res = await userApi.updateProfile({ country, currency });
      setProfile(res.profile || res.data?.profile || res.data);
      setMessage('Profile saved');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Failed to save profile', err);
      setMessage('Failed to save');
    }
  };

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 720, margin: '24px auto', padding: 20 }}>
      <h2>Profile</h2>
      <div style={{ marginTop: 12 }}>
        <label>Username</label>
        <div style={{ padding: 12, background: '#f3f4f6', borderRadius: 8 }}>{profile?.username}</div>
      </div>

      <div style={{ marginTop: 12 }}>
        <label>Country</label>
        <select value={country} onChange={(e) => setCountry(e.target.value)} style={{ display: 'block', padding: 10, marginTop: 6 }}>
          <option value="Kenya">Kenya (KES)</option>
          <option value="Uganda">Uganda (UGX)</option>
          <option value="Tanzania">Tanzania (TZS)</option>
        </select>
      </div>

      <div style={{ marginTop: 12 }}>
        <label>Currency</label>
        <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ display: 'block', padding: 10, marginTop: 6 }}>
          <option value="KES">KEN (KES)</option>
          <option value="UGX">UGX</option>
          <option value="TZS">TZS</option>
        </select>
      </div>

      <div style={{ marginTop: 16 }}>
        <button onClick={save} style={{ padding: '10px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: 8 }}>Save</button>
        <span style={{ marginLeft: 12 }}>{message}</span>
      </div>
    </div>
  );
}
