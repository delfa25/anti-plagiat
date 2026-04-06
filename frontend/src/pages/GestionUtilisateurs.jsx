import { useEffect, useState } from 'react';
import api from '../api';
import { Icons } from '../components/Icons';

const roleLabels = {
  superadmin: 'Super Admin',
  directeur: 'Directeur Adjoint',
  chef: 'Chef de département',
  etudiant: 'Étudiant',
};

const roleBadge = {
  superadmin: 'bg-purple-100 text-purple-700',
  directeur: 'bg-sky-100 text-sky-700',
  chef: 'bg-orange-100 text-orange-700',
  etudiant: 'bg-gray-100 text-gray-600',
};

const roleFilters = [
  { key: 'tous', label: 'Tous' },
  { key: 'etudiant', label: 'Étudiants' },
  { key: 'chef', label: 'Chefs dept.' },
  { key: 'directeur', label: 'Directeurs' },
  { key: 'superadmin', label: 'Admins' },
];

const emptyForm = { email: '', nom: '', prenom: '', role: 'etudiant', password: '' };

export default function GestionUtilisateurs({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('tous');

  const fetchUsers = () => {
    setLoading(true);
    api.get('/users/').then(res => {
      setUsers(res.data);
      setLoading(false);
    });
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editId) {
        const data = { ...form };
        if (!data.password) delete data.password;
        await api.put(`/users/${editId}/`, data);
      } else {
        await api.post('/users/', form);
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditId(null);
      fetchUsers();
    } catch {
      setError("Erreur lors de l'enregistrement. Vérifiez les données.");
    }
  };

  const handleEdit = (user) => {
    setForm({ email: user.email, nom: user.nom || '', prenom: user.prenom || '', role: user.role, password: '' });
    setEditId(user.id);
    setShowForm(true);
    setError('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Confirmer la suppression ?')) return;
    await api.delete(`/users/${id}/`);
    fetchUsers();
  };

  const handleCancel = () => {
    setShowForm(false);
    setForm(emptyForm);
    setEditId(null);
    setError('');
  };

  const availableRoles = currentUser.role === 'superadmin'
    ? Object.entries(roleLabels)
    : Object.entries(roleLabels).filter(([k]) => k !== 'superadmin');

  const filtered = users.filter(u => {
    const matchRole = activeFilter === 'tous' || u.role === activeFilter;
    const matchSearch =
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.nom || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.prenom || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.ine || '').toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const countByRole = (role) => users.filter(u => u.role === role).length;

  const isEtudiantView = activeFilter === 'etudiant';

  return (
    <div className="space-y-5 max-w-5xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Utilisateurs</h2>
          <p className="text-gray-400 text-sm">{filtered.length} résultat(s)</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); setError(''); }}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          <div className="w-4 h-4">{Icons.user}</div>
          Nouvel utilisateur
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">{editId ? 'Modifier' : 'Créer'} un utilisateur</h3>
          {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 mb-4 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-600 text-sm font-medium mb-1">Prénom</label>
              <input type="text" value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                placeholder="Prénom" />
            </div>
            <div>
              <label className="block text-gray-600 text-sm font-medium mb-1">Nom</label>
              <input type="text" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                placeholder="Nom" />
            </div>
            <div>
              <label className="block text-gray-600 text-sm font-medium mb-1">Email <span className="text-red-400">*</span></label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                placeholder="email@ibam.bf" required />
            </div>
            <div>
              <label className="block text-gray-600 text-sm font-medium mb-1">Rôle <span className="text-red-400">*</span></label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition">
                {availableRoles.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-gray-600 text-sm font-medium mb-1">
                Mot de passe {editId && <span className="text-gray-400 font-normal">(laisser vide pour ne pas changer)</span>}
                {!editId && <span className="text-red-400"> *</span>}
              </label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                placeholder="••••••••" required={!editId} />
            </div>
            <div className="sm:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={handleCancel} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition">
                Annuler
              </button>
              <button type="submit" className="px-4 py-2 text-sm bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-lg transition">
                {editId ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtres par rôle */}
      <div className="flex items-center gap-2 flex-wrap">
        {roleFilters.map(f => {
          const count = f.key === 'tous' ? users.length : countByRole(f.key);
          return (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition border
                ${activeFilter === f.key
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-sky-300 hover:text-sky-600'
                }`}
            >
              {f.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeFilter === f.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400">{Icons.mail}</div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={isEtudiantView ? "Rechercher par nom, email ou INE..." : "Rechercher par nom ou email..."}
          className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition shadow-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">Aucun utilisateur trouvé.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Utilisateur</th>
                {isEtudiantView && (
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">INE</th>
                )}
                {!isEtudiantView && (
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Rôle</th>
                )}
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Statut</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0">
                        {u.email[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-gray-800 font-medium text-sm">
                          {u.prenom || u.nom ? `${u.prenom || ''} ${u.nom || ''}`.trim() : '—'}
                        </p>
                        <p className="text-gray-400 text-xs">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  {isEtudiantView && (
                    <td className="px-5 py-3.5">
                      {u.ine
                        ? <span className="font-mono text-xs bg-sky-50 text-sky-700 border border-sky-100 px-2 py-1 rounded">{u.ine}</span>
                        : <span className="text-gray-300 text-xs">—</span>
                      }
                    </td>
                  )}
                  {!isEtudiantView && (
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${roleBadge[u.role] || 'bg-gray-100 text-gray-600'}`}>
                        {roleLabels[u.role] || u.role}
                      </span>
                    </td>
                  )}
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {u.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => handleEdit(u)} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition">
                        <div className="w-3.5 h-3.5">{Icons.check}</div>
                      </button>
                      {u.id !== currentUser.id && (
                        <button onClick={() => handleDelete(u.id)} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                          <div className="w-3.5 h-3.5">{Icons.logout}</div>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
