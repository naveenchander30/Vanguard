import { useState, useEffect, FormEvent } from 'react';
import {
  fetchInfrastructure,
  createInfrastructure,
  updateInfrastructure,
  deleteInfrastructure,
} from '../api/client';
import type { Infrastructure } from '../api/client';

export default function InfrastructurePage() {
  const [items, setItems] = useState<Infrastructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Infrastructure | null>(null);
  const [form, setForm] = useState({ bssid: '', ssid: '', label: '', band: '', notes: '', ipAddress: '', supportsSnmp: false, snmpOid: '', snmpCommunity: '' });

  const load = () => {
    setLoading(true);
    fetchInfrastructure()
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const resetForm = () => {
    setForm({ bssid: '', ssid: '', label: '', band: '', notes: '', ipAddress: '', supportsSnmp: false, snmpOid: '', snmpCommunity: '' });
    setEditing(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateInfrastructure(editing.id, form);
      } else {
        await createInfrastructure(form);
      }
      resetForm();
      load();
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const handleEdit = (item: Infrastructure) => {
    setForm({
      bssid: item.bssid,
      ssid: item.ssid || '',
      label: item.label || '',
      band: item.band || '',
      notes: item.notes || '',
      ipAddress: item.ipAddress || '',
      supportsSnmp: item.supportsSnmp,
      snmpOid: item.snmpOid || '',
      snmpCommunity: item.snmpCommunity || '',
    });
    setEditing(item);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this infrastructure entry?')) return;
    try {
      await deleteInfrastructure(id);
      load();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Infrastructure</h1>
      </div>

      <form className="infra-form" onSubmit={handleSubmit}>
        <h2>{editing ? 'Edit AP' : 'Add AP'}</h2>
        <div className="form-row">
          <input
            placeholder="BSSID (AA:BB:CC:DD:EE:FF)"
            value={form.bssid}
            onChange={(e) => setForm({ ...form, bssid: e.target.value })}
            required
          />
          <input
            placeholder="SSID"
            value={form.ssid}
            onChange={(e) => setForm({ ...form, ssid: e.target.value })}
          />
          <input
            placeholder="Label"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
          />
          <input
            placeholder="Band (2.4GHz / 5GHz / 6GHz)"
            value={form.band}
            onChange={(e) => setForm({ ...form, band: e.target.value })}
          />
          <input
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
        <div className="form-row">
          <input
            placeholder="IP Address"
            value={form.ipAddress}
            onChange={(e) => setForm({ ...form, ipAddress: e.target.value })}
          />
          <input
            placeholder="SNMP OID"
            value={form.snmpOid}
            onChange={(e) => setForm({ ...form, snmpOid: e.target.value })}
          />
          <input
            placeholder="SNMP Community"
            value={form.snmpCommunity}
            onChange={(e) => setForm({ ...form, snmpCommunity: e.target.value })}
          />
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.supportsSnmp}
              onChange={(e) => setForm({ ...form, supportsSnmp: e.target.checked })}
            />
            Supports SNMP
          </label>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn">{editing ? 'Update' : 'Add'}</button>
          {editing && <button type="button" className="btn btn-cancel" onClick={resetForm}>Cancel</button>}
        </div>
      </form>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>BSSID</th>
              <th>SSID</th>
              <th>Label</th>
              <th>Band</th>
              <th>IP</th>
              <th>SNMP</th>
              <th>OID</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td className="mono">{item.bssid}</td>
                <td>{item.ssid}</td>
                <td>{item.label}</td>
                <td>{item.band}</td>
                <td className="mono">{item.ipAddress || '-'}</td>
                <td>{item.supportsSnmp ? <span className="source source-snmp">SNMP</span> : '-'}</td>
                <td className="mono">{item.snmpOid || '-'}</td>
                <td>{item.notes}</td>
                <td className="actions-cell">
                  <button className="btn btn-small" onClick={() => handleEdit(item)}>Edit</button>
                  <button className="btn btn-small btn-danger" onClick={() => handleDelete(item.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
