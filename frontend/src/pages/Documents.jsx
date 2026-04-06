import { useEffect, useState } from 'react';
import api from '../api';
import { Icons } from '../components/Icons';

const statutBadge = {
  soumis: 'bg-gray-100 text-gray-600',
  en_attente: 'bg-yellow-100 text-yellow-700',
  valide: 'bg-green-100 text-green-700',
  rejete: 'bg-red-100 text-red-600',
};

const statutLabels = {
  soumis: 'Soumis',
  en_attente: 'En attente',
  valide: 'Validé',
  rejete: 'Rejeté',
};

export default function Documents({ currentUser }) {
  const [documents, setDocuments] = useState([]);
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ titre: '', theme: '', fichier: null });
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [commentaire, setCommentaire] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('tous');
  const [testLoading, setTestLoading] = useState(null);

  const isEtudiant = currentUser.role === 'etudiant';
  const canValidate = ['chef', 'directeur', 'superadmin'].includes(currentUser.role);

  const fetchDocuments = () => {
    setLoading(true);
    api.get('/documents/').then(res => {
      setDocuments(res.data);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchDocuments();
    if (isEtudiant) {
      api.get('/themes/').then(res => setThemes(res.data.filter(t => t.statut === 'valide')));
    }
  }, [isEtudiant]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.fichier) { setError('Veuillez sélectionner un fichier PDF.'); return; }
    try {
      const data = new FormData();
      data.append('titre', form.titre);
      data.append('theme', form.theme);
      data.append('fichier', form.fichier);
      await api.post('/documents/', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowForm(false);
      setForm({ titre: '', theme: '', fichier: null });
      fetchDocuments();
    } catch {
      setError('Erreur lors de la soumission.');
    }
  };

  const handleTestPlagiat = async (id) => {
    setTestLoading(id);
    try {
      await api.post(`/plagiarism/lancer/${id}/`);
      fetchDocuments();
    } catch {
      alert('Erreur lors du test de plagiat.');
    } finally {
      setTestLoading(null);
    }
  };

  const handleValider = async (id, statut) => {
    try {
      await api.patch(`/documents/${id}/`, { statut, commentaire_validation: commentaire });
      setSelected(null);
      setCommentaire('');
      fetchDocuments();
    } catch {
      alert('Erreur lors de la validation.');
    }
  };

  const filters = [
    { key: 'tous', label: 'Tous', count: documents.length },
    { key: 'soumis', label: 'Soumis', count: documents.filter(d => d.statut === 'soumis').length },
    { key: 'en_attente', label: 'En attente', count: documents.filter(d => d.statut === 'en_attente').length },
    { key: 'valide', label: 'Validés', count: documents.filter(d => d.statut === 'valide').length },
    { key: 'rejete', label: 'Rejetés', count: documents.filter(d => d.statut === 'rejete').length },
  ];

  const filtered = documents.filter(d => {
    const matchFilter = activeFilter === 'tous' || d.statut === activeFilter;
    const matchSearch = d.titre.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div className="space-y-5 max-w-5xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {isEtudiant ? 'Mes mémoires' : 'Mémoires à valider'}
          </h2>
          <p className="text-gray-400 text-sm">{filtered.length} mémoire(s)</p>
        </div>
        {isEtudiant && (
          <button
            onClick={() => { setShowForm(true); setError(''); }}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            <div className="w-4 h-4">{Icons.document}</div>
            Soumettre un mémoire
          </button>
        )}
      </div>

      {/* Form soumission */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Nouveau mémoire</h3>
          {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 mb-4 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-600 text-sm font-medium mb-1">Titre <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={form.titre}
                onChange={e => setForm({ ...form, titre: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                placeholder="Titre du mémoire"
                required
              />
            </div>
            <div>
              <label className="block text-gray-600 text-sm font-medium mb-1">Thème associé <span className="text-red-400">*</span></label>
              <select
                value={form.theme}
                onChange={e => setForm({ ...form, theme: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                required
              >
                <option value="">Sélectionner un thème validé</option>
                {themes.map(t => <option key={t.id} value={t.id}>{t.titre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-gray-600 text-sm font-medium mb-1">Fichier PDF <span className="text-red-400">*</span></label>
              <input
                type="file"
                accept=".pdf"
                onChange={e => setForm({ ...form, fichier: e.target.files[0] })}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:text-gray-700 transition">
                Annuler
              </button>
              <button type="submit" className="px-4 py-2 text-sm bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-lg transition">
                Soumettre
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal validation */}
      {selected && canValidate && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-gray-900 mb-1">Valider le mémoire</h3>
            <p className="text-gray-500 text-sm mb-4">{selected.titre}</p>
            {selected.taux_plagiat > 0 && (
              <div className={`rounded-lg p-3 mb-4 text-sm font-medium ${selected.taux_plagiat > 30 ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                Taux de plagiat : {selected.taux_plagiat}%
              </div>
            )}
            <div className="mb-4">
              <label className="block text-gray-600 text-sm font-medium mb-1">Commentaire</label>
              <textarea
                value={commentaire}
                onChange={e => setCommentaire(e.target.value)}
                rows={3}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition resize-none"
                placeholder="Commentaire optionnel..."
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setSelected(null); setCommentaire(''); }} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:text-gray-700 transition">
                Annuler
              </button>
              <button onClick={() => handleValider(selected.id, 'rejete')} className="px-4 py-2 text-sm bg-red-500 hover:bg-red-400 text-white font-medium rounded-lg transition">
                Rejeter
              </button>
              <button onClick={() => handleValider(selected.id, 'valide')} className="px-4 py-2 text-sm bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg transition">
                Valider
              </button>
            </div>
          </div>
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
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400">{Icons.document}</div>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un mémoire..."
          className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition shadow-sm" />
      </div>

      {/* Liste */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400 text-sm shadow-sm">
            <div className="w-10 h-10 mx-auto mb-3 text-gray-200">{Icons.document}</div>
            Aucun mémoire trouvé.
          </div>
        ) : filtered.map(d => (
          <div key={d.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statutBadge[d.statut]}`}>
                    {statutLabels[d.statut]}
                  </span>
                  {d.taux_plagiat > 0 && (
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${d.taux_plagiat > 30 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                      Plagiat : {d.taux_plagiat}%
                    </span>
                  )}
                </div>
                <h3 className="text-gray-900 font-semibold text-sm mb-1">{d.titre}</h3>
                <p className="text-gray-300 text-xs">
                  {new Date(d.date_soumission).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isEtudiant && d.statut === 'soumis' && (
                  <button
                    onClick={() => handleTestPlagiat(d.id)}
                    disabled={testLoading === d.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 text-xs font-medium rounded-lg transition border border-orange-100 disabled:opacity-50"
                  >
                    {testLoading === d.id ? (
                      <div className="w-3.5 h-3.5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <div className="w-3.5 h-3.5">{Icons.shield}</div>
                    )}
                    Tester plagiat
                  </button>
                )}
                {canValidate && d.statut === 'soumis' && (
                  <button
                    onClick={() => setSelected(d)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-medium rounded-lg transition border border-sky-100"
                  >
                    <div className="w-3.5 h-3.5">{Icons.check}</div>
                    Valider
                  </button>
                )}
                {d.fichier && (
                  <a href={`http://localhost:8000${d.fichier}`} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium rounded-lg transition border border-gray-200">
                    <div className="w-3.5 h-3.5">{Icons.document}</div>
                    Voir
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
