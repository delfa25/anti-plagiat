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

const emptyForm = { titre: '', description: '' };

export default function Themes({ currentUser }) {
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [commentaire, setCommentaire] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('tous');

  const isEtudiant = currentUser.role === 'etudiant';
  const canValidate = ['chef', 'directeur', 'superadmin'].includes(currentUser.role);

  const fetchThemes = () => {
    setLoading(true);
    api.get('/themes/').then(res => {
      setThemes(res.data);
      setLoading(false);
    });
  };

  useEffect(() => { fetchThemes(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/themes/', form);
      setShowForm(false);
      setForm(emptyForm);
      fetchThemes();
    } catch {
      setError('Erreur lors de la soumission.');
    }
  };

  const handleValider = async (id, statut) => {
    try {
      await api.patch(`/themes/${id}/`, { statut, commentaire_validation: commentaire });
      setSelected(null);
      setCommentaire('');
      fetchThemes();
    } catch {
      alert('Erreur lors de la validation.');
    }
  };

  const filters = [
    { key: 'tous', label: 'Tous', count: themes.length },
    { key: 'soumis', label: 'Soumis', count: themes.filter(t => t.statut === 'soumis').length },
    { key: 'en_attente', label: 'En attente', count: themes.filter(t => t.statut === 'en_attente').length },
    { key: 'valide', label: 'Validés', count: themes.filter(t => t.statut === 'valide').length },
    { key: 'rejete', label: 'Rejetés', count: themes.filter(t => t.statut === 'rejete').length },
  ];

  const filtered = themes.filter(t => {
    const matchFilter = activeFilter === 'tous' || t.statut === activeFilter;
    const matchSearch = t.titre.toLowerCase().includes(search.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div className="space-y-5 max-w-5xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {isEtudiant ? 'Mes thèmes' : 'Thèmes à valider'}
          </h2>
          <p className="text-gray-400 text-sm">{filtered.length} thème(s)</p>
        </div>
        {isEtudiant && (
          <button
            onClick={() => { setShowForm(true); setError(''); setForm(emptyForm); }}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            <div className="w-4 h-4">{Icons.theme}</div>
            Soumettre un thème
          </button>
        )}
      </div>

      {/* Form soumission */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Nouveau thème</h3>
          {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 mb-4 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-600 text-sm font-medium mb-1">Titre <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={form.titre}
                onChange={e => setForm({ ...form, titre: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                placeholder="Titre de votre thème"
                required
              />
            </div>
            <div>
              <label className="block text-gray-600 text-sm font-medium mb-1">Description <span className="text-red-400">*</span></label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={4}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition resize-none"
                placeholder="Décrivez votre thème..."
                required
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
            <h3 className="font-semibold text-gray-900 mb-1">Valider le thème</h3>
            <p className="text-gray-500 text-sm mb-4">{selected.titre}</p>
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
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400">{Icons.document}</div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un thème..."
          className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition shadow-sm"
        />
      </div>

      {/* Liste */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400 text-sm shadow-sm">
            <div className="w-10 h-10 mx-auto mb-3 text-gray-200">{Icons.theme}</div>
            Aucun thème trouvé.
          </div>
        ) : filtered.map(t => (
          <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statutBadge[t.statut]}`}>
                    {statutLabels[t.statut]}
                  </span>
                  {t.taux_plagiat > 0 && (
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${t.taux_plagiat > 30 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                      Plagiat : {t.taux_plagiat}%
                    </span>
                  )}
                </div>
                <h3 className="text-gray-900 font-semibold text-sm mb-1">{t.titre}</h3>
                <p className="text-gray-400 text-xs line-clamp-2">{t.description}</p>
                <p className="text-gray-300 text-xs mt-2">
                  {new Date(t.date_soumission).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
              {canValidate && t.statut === 'soumis' && (
                <button
                  onClick={() => setSelected(t)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-medium rounded-lg transition border border-sky-100"
                >
                  <div className="w-3.5 h-3.5">{Icons.check}</div>
                  Valider
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
