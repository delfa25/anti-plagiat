import { useEffect, useState } from 'react';
import api from '../api';
import { Icons } from '../components/Icons';

const typeLabels = { theme: 'Thème', memoire: 'Mémoire' };
const typeBadge = { theme: 'bg-sky-100 text-sky-700', memoire: 'bg-orange-100 text-orange-700' };

const emptyForm = {
  titre_theme: '', titre_memoire: '',
  auteur: '', annee: '', description: '',
  fichier_memoire: null,
};

const emptyEditForm = { titre: '', auteur: '', annee: '', description: '' };

export default function Bibliotheque({ currentUser }) {
  const [ressources, setRessources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('tous');
  const [typeFilter, setTypeFilter] = useState('tous');
  const [ajoutManuelActif, setAjoutManuelActif] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  const canManageRole = ['superadmin', 'directeur'].includes(currentUser.role) || currentUser.is_superuser;
  const canManage = canManageRole && ajoutManuelActif;

  const fetchRessources = () => {
    setLoading(true);
    api.get('/bibliotheque/').then(res => {
      setRessources(res.data);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchRessources();
    api.get('/parametres/valeur/ajout_manuel_bibliotheque/')
      .then(res => setAjoutManuelActif(res.data.valeur === 'true'))
      .catch(() => setAjoutManuelActif(true));
  }, []);

  // Création paire thème + mémoire
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.fichier_memoire) { setError('Le fichier PDF du mémoire est obligatoire.'); return; }
    try {
      const data = new FormData();
      data.append('titre_theme', form.titre_theme);
      data.append('titre_memoire', form.titre_memoire);
      data.append('fichier_memoire', form.fichier_memoire);
      if (form.auteur) data.append('auteur', form.auteur);
      if (form.annee) data.append('annee', form.annee);
      if (form.description) data.append('description', form.description);
      await api.post('/bibliotheque/ajouter-paire/', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowForm(false);
      setForm(emptyForm);
      if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
      fetchRessources();
    } catch (err) {
      setError(err.response?.data?.error || "Erreur lors de l'enregistrement.");
    }
  };

  // Édition individuelle (titre, auteur, année, description)
  const handleEdit = (r) => {
    setEditId(r.id);
    setEditForm({ titre: r.titre, auteur: r.auteur || '', annee: r.annee || '', description: r.description || '' });
    setError('');
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.patch(`/bibliotheque/${editId}/`, editForm);
      setEditId(null);
      fetchRessources();
    } catch {
      setError("Erreur lors de la modification.");
    }
  };

  // Extraction auto depuis le PDF du mémoire
  const handleFichierChange = async (e) => {
    const fichier = e.target.files[0];
    if (!fichier) return;
    setForm(f => ({ ...f, fichier_memoire: fichier }));
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(fichier));
    setExtracting(true);
    try {
      const data = new FormData();
      data.append('fichier', fichier);
      const res = await api.post('/bibliotheque/extraire-infos/', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setForm(f => ({
        ...f,
        titre_memoire: res.data.titre || f.titre_memoire,
        titre_theme: f.titre_theme || res.data.titre || '',
        auteur: res.data.auteur || f.auteur,
        annee: res.data.annee || f.annee,
      }));
    } catch {
      setError("Impossible d'extraire les informations du PDF.");
    } finally {
      setExtracting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette paire (thème + mémoire) ?')) return;
    await api.delete(`/bibliotheque/${id}/`);
    fetchRessources();
  };

  const handleToggle = async (id) => {
    await api.patch(`/bibliotheque/${id}/toggle/`);
    fetchRessources();
  };

  const getFileUrl = (fichier) => {
    if (!fichier) return null;
    return fichier.startsWith('http') ? fichier : `http://localhost:8000${fichier}`;
  };

  const filters = [
    { key: 'tous', label: 'Toutes', count: ressources.length },
    { key: 'actif', label: 'Actives', count: ressources.filter(r => r.actif).length },
    { key: 'inactif', label: 'Inactives', count: ressources.filter(r => !r.actif).length },
  ];

  const typeFilters = [
    { key: 'tous', label: 'Tous types' },
    { key: 'memoire', label: 'Mémoires' },
    { key: 'theme', label: 'Thèmes' },
  ];

  const filtered = ressources.filter(r => {
    const matchActif = activeFilter === 'tous' || (activeFilter === 'actif' ? r.actif : !r.actif);
    const matchType = typeFilter === 'tous' || r.type === typeFilter;
    const matchSearch = r.titre.toLowerCase().includes(search.toLowerCase()) ||
      (r.auteur || '').toLowerCase().includes(search.toLowerCase());
    return matchActif && matchType && matchSearch;
  });

  const inputCls = "w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition";

  return (
    <div className="space-y-5 max-w-5xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Bibliothèque de ressources</h2>
          <p className="text-gray-400 text-sm">{filtered.length} ressource(s)</p>
        </div>
        {canManage && (
          <button
            onClick={() => { setShowForm(true); setForm(emptyForm); setError(''); if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); } }}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            <div className="w-4 h-4">{Icons.document}</div>
            Ajouter thème + mémoire
          </button>
        )}
      </div>

      {canManageRole && !ajoutManuelActif && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
          L'ajout manuel à la bibliothèque est désactivé dans les paramètres système.
        </div>
      )}

      {/* Formulaire création paire */}
      {showForm && canManage && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="mb-5">
            <h3 className="font-semibold text-gray-800">Ajouter une paire thème + mémoire</h3>
            <p className="text-xs text-gray-400 mt-0.5">Un thème et son mémoire sont toujours enregistrés ensemble et liés.</p>
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 mb-4 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Fichier mémoire en premier pour extraction auto */}
            <div>
              <label className="block text-gray-600 text-sm font-medium mb-1">
                Fichier PDF du mémoire <span className="text-red-400">*</span>
              </label>
              <input type="file" accept=".pdf" onChange={handleFichierChange} className={inputCls} required />
              {form.fichier_memoire && (
                <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-sky-50 border border-sky-100 rounded-lg">
                  <div className="w-4 h-4 text-sky-500 shrink-0">{Icons.document}</div>
                  <span className="text-xs text-sky-700 font-medium truncate">{form.fichier_memoire.name}</span>
                  <span className="text-xs text-sky-400 shrink-0">({(form.fichier_memoire.size / 1024).toFixed(0)} Ko)</span>
                  {extracting && (
                    <span className="ml-auto flex items-center gap-1 text-xs text-sky-500">
                      <div className="w-3 h-3 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
                      Extraction en cours...
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Aperçu PDF */}
            {previewUrl && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-gray-600 text-sm font-medium">Aperçu du mémoire</label>
                  <button type="button" onClick={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}
                    className="text-xs text-gray-400 hover:text-red-500 transition">Fermer</button>
                </div>
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                  <iframe src={previewUrl} title="Aperçu PDF" className="w-full" style={{ height: '400px' }} />
                </div>
              </div>
            )}

            {/* Séparateur thème */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-3">Thème</p>
              <div>
                <label className="block text-gray-600 text-sm font-medium mb-1">Titre du thème <span className="text-red-400">*</span></label>
                <input type="text" value={form.titre_theme} onChange={e => setForm({ ...form, titre_theme: e.target.value })}
                  className={inputCls} placeholder="Intitulé du thème de recherche" required />
              </div>
            </div>

            {/* Séparateur mémoire */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-orange-500 uppercase tracking-wide mb-3">Mémoire</p>
              <div>
                <label className="block text-gray-600 text-sm font-medium mb-1">Titre du mémoire <span className="text-red-400">*</span></label>
                <input type="text" value={form.titre_memoire} onChange={e => setForm({ ...form, titre_memoire: e.target.value })}
                  className={inputCls} placeholder="Titre du mémoire (extrait automatiquement)" required />
              </div>
            </div>

            {/* Infos communes */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Informations communes</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-600 text-sm font-medium mb-1">Auteur</label>
                  <input type="text" value={form.auteur} onChange={e => setForm({ ...form, auteur: e.target.value })}
                    className={inputCls} placeholder="Nom de l'auteur" />
                </div>
                <div>
                  <label className="block text-gray-600 text-sm font-medium mb-1">Année</label>
                  <input type="number" value={form.annee} onChange={e => setForm({ ...form, annee: e.target.value })}
                    className={inputCls} placeholder="2024" min="2000" max="2100" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-gray-600 text-sm font-medium mb-1">Description</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    rows={2} className={`${inputCls} resize-none`} placeholder="Description optionnelle..." />
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => { setShowForm(false); if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); } }}
                className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:text-gray-700 transition">Annuler</button>
              <button type="submit" className="px-4 py-2 text-sm bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-lg transition">
                Enregistrer la paire
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtres */}
      <div className="flex items-center gap-2 flex-wrap">
        {filters.map(f => (
          <button key={f.key} onClick={() => setActiveFilter(f.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition border
              ${activeFilter === f.key ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-gray-500 border-gray-200 hover:border-sky-300 hover:text-sky-600'}`}>
            {f.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeFilter === f.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{f.count}</span>
          </button>
        ))}
        <div className="w-px h-5 bg-gray-200 mx-1"></div>
        {typeFilters.map(f => (
          <button key={f.key} onClick={() => setTypeFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border
              ${typeFilter === f.key ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300 hover:text-orange-500'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400">{Icons.document}</div>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par titre ou auteur..."
          className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition shadow-sm" />
      </div>

      {/* Liste */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            <div className="w-10 h-10 mx-auto mb-3 text-gray-200">{Icons.document}</div>
            Aucune ressource trouvée.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Ressource</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Type</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Lié à</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Année</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Statut</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(r => (
                <tr key={r.id} className={`hover:bg-gray-50 transition ${!r.actif ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-3.5">
                    {editId === r.id ? (
                      <form onSubmit={handleUpdate} className="space-y-2 min-w-[220px]">
                        {error && <p className="text-xs text-red-500">{error}</p>}
                        <input value={editForm.titre} onChange={e => setEditForm({ ...editForm, titre: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm" required />
                        <input value={editForm.auteur} onChange={e => setEditForm({ ...editForm, auteur: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs" placeholder="Auteur" />
                        <input type="number" value={editForm.annee} onChange={e => setEditForm({ ...editForm, annee: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs" placeholder="Année" />
                        <div className="flex gap-2">
                          <button type="submit" className="px-3 py-1 text-xs bg-sky-600 text-white rounded hover:bg-sky-500 transition">OK</button>
                          <button type="button" onClick={() => setEditId(null)} className="px-3 py-1 text-xs text-gray-500 border border-gray-200 rounded hover:text-gray-700 transition">Annuler</button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <p className="text-gray-800 font-medium text-sm">{r.titre}</p>
                        {r.auteur && <p className="text-gray-400 text-xs">{r.auteur}</p>}
                      </>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${typeBadge[r.type]}`}>
                      {typeLabels[r.type]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {r.ressource_liee_titre
                      ? <span className="text-xs text-gray-500 italic">{r.ressource_liee_titre}</span>
                      : <span className="text-xs text-red-400">—</span>
                    }
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 text-sm">{r.annee || '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${r.actif ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {r.actif ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2 justify-end">
                      {getFileUrl(r.fichier) && (
                        <a href={getFileUrl(r.fichier)} target="_blank" rel="noreferrer"
                          className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition">
                          <div className="w-3.5 h-3.5">{Icons.document}</div>
                        </a>
                      )}
                      {canManage && (
                        <>
                          <button onClick={() => handleToggle(r.id)}
                            className={`w-7 h-7 flex items-center justify-center rounded-lg transition ${r.actif ? 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}>
                            <div className="w-3.5 h-3.5">{Icons.shield}</div>
                          </button>
                          <button onClick={() => handleEdit(r)}
                            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition">
                            <div className="w-3.5 h-3.5">{Icons.check}</div>
                          </button>
                          <button onClick={() => handleDelete(r.id)}
                            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                            title="Supprimer la paire (thème + mémoire)">
                            <div className="w-3.5 h-3.5">{Icons.logout}</div>
                          </button>
                        </>
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
