import { useEffect, useState } from 'react';
import api from '../api';
import { Icons } from '../components/Icons';

const statutBadge = {
  brouillon: 'bg-gray-100 text-gray-500',
  soumis: 'bg-blue-100 text-blue-700',
  valide: 'bg-green-100 text-green-700',
  rejete: 'bg-red-100 text-red-600',
};

const statutLabels = {
  brouillon: 'Brouillon',
  soumis: 'Soumis',
  valide: 'Validé',
  rejete: 'Rejeté',
};

const emptyForm = { titre: '', description: '' };

function HistoriqueTests({ tests, seuil }) {
  const [open, setOpen] = useState(false);
  if (!tests || tests.length === 0) return null;
  const dernier = tests[0];

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-xs text-gray-500 hover:text-sky-600 transition font-medium"
      >
        <div className="w-3.5 h-3.5">{Icons.shield}</div>
        {tests.length} test{tests.length > 1 ? 's' : ''} effectué{tests.length > 1 ? 's' : ''}
        — Dernier : {' '}
        <span className={`font-bold ${dernier.taux_plagiat > seuil ? 'text-red-600' : 'text-green-600'}`}>
          {dernier.taux_plagiat}%
        </span>
        <span className="ml-1 text-gray-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-2 space-y-1.5">
          {tests.map((t, i) => (
            <div key={t.id} className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs border
              ${t.taux_plagiat > seuil
                ? 'bg-red-50 border-red-100 text-red-700'
                : 'bg-green-50 border-green-100 text-green-700'}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-gray-400 font-medium">#{tests.length - i}</span>
                <span className={`font-bold text-sm ${t.taux_plagiat > seuil ? 'text-red-600' : 'text-green-600'}`}>
                  {t.taux_plagiat}%
                </span>
                <span className={`px-2 py-0.5 rounded-full font-medium ${t.taux_plagiat > seuil
                  ? 'bg-red-100 text-red-600'
                  : 'bg-green-100 text-green-700'}`}>
                  {t.taux_plagiat > seuil ? '⚠ Au-dessus du seuil' : '✓ Sous le seuil'}
                </span>
              </div>
              <div className="text-gray-400 text-right">
                <p>{new Date(t.date_test).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                <p>{new Date(t.date_test).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          ))}
          <p className="text-xs text-gray-400 pt-1">Seuil configuré : {seuil}%</p>
        </div>
      )}
    </div>
  );
}

export default function Themes({ currentUser }) {
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [commentaire, setCommentaire] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('tous');
  const [testLoading, setTestLoading] = useState(null);
  const [seuilPlagiat, setSeuilPlagiat] = useState(20);
  const [testsParTheme, setTestsParTheme] = useState({});

  const isEtudiant = currentUser.role === 'etudiant';
  const canValidate = ['chef', 'directeur', 'superadmin'].includes(currentUser.role);

  const fetchTests = () => {
    api.get('/plagiarism/themes/').then(res => {
      const map = {};
      res.data.forEach(t => {
        if (!map[t.theme]) map[t.theme] = [];
        map[t.theme].push(t);
      });
      // Trier par date décroissante
      Object.keys(map).forEach(k => {
        map[k].sort((a, b) => new Date(b.date_test) - new Date(a.date_test));
      });
      setTestsParTheme(map);
    }).catch(() => {});
  };

  const fetchThemes = () => {
    setLoading(true);
    api.get('/themes/').then(res => {
      setThemes(res.data);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchThemes();
    fetchTests();
    api.get('/parametres/valeur/seuil_plagiat/')
      .then(res => setSeuilPlagiat(Number(res.data.valeur) || 20))
      .catch(() => setSeuilPlagiat(20));
  }, []);

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editId) {
        await api.patch(`/themes/${editId}/`, form);
      } else {
        await api.post('/themes/', form);
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditId(null);
      fetchThemes();
    } catch {
      setError('Erreur lors de la soumission.');
    }
  };

  const handleEdit = (t) => {
    setForm({ titre: t.titre, description: t.description });
    setEditId(t.id);
    setShowForm(true);
    setError('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce thème ?')) return;
    await api.delete(`/themes/${id}/`);
    fetchThemes();
  };

  const handleSoumettre = async (id) => {
    if (!window.confirm('Soumettre ce thème ? Vous ne pourrez plus le supprimer.')) return;
    try {
      await api.post(`/themes/${id}/soumettre/`);
      fetchThemes();
    } catch {
      alert('Erreur lors de la soumission.');
    }
  };

  const handleTestPlagiat = async (id) => {
    setTestLoading(id);
    try {
      await api.post(`/plagiarism/lancer-theme/${id}/`);
      fetchThemes();
      fetchTests();
    } catch {
      alert('Erreur lors du test de plagiat.');
    } finally {
      setTestLoading(null);
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
    ...(isEtudiant ? [
      { key: 'brouillon', label: 'Brouillons', count: themes.filter(t => t.statut === 'brouillon').length },
    ] : []),
    { key: 'soumis', label: 'Soumis', count: themes.filter(t => t.statut === 'soumis').length },
    { key: 'valide', label: 'Validés', count: themes.filter(t => t.statut === 'valide').length },
    { key: 'rejete', label: 'Rejetés', count: themes.filter(t => t.statut === 'rejete').length },
  ];

  const filtered = themes.filter(t => {
    const matchFilter = activeFilter === 'tous' || t.statut === activeFilter;
    const matchSearch = t.titre.toLowerCase().includes(search.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const canCreateTheme = !isEtudiant || themes.length === 0;

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
        {isEtudiant && canCreateTheme && (
          <button
            onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); setError(''); }}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            <div className="w-4 h-4">{Icons.theme}</div>
            Nouveau thème
          </button>
        )}
      </div>

      {isEtudiant && !canCreateTheme && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
          Vous avez deja un seul theme autorise. Modifiez la soumission existante puis resoumettez-la.
        </div>
      )}

      {/* Workflow info */}
      {isEtudiant && (
        <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 text-sm text-sky-700">
          <p className="font-medium mb-1">Workflow de soumission</p>
          <div className="flex items-center gap-2 flex-wrap text-xs text-sky-600">
            <span className="bg-white border border-sky-200 px-2 py-1 rounded">1. Créer le thème</span>
            <span>→</span>
            <span className="bg-white border border-sky-200 px-2 py-1 rounded">2. Tester le plagiat</span>
            <span>→</span>
            <span className="bg-white border border-sky-200 px-2 py-1 rounded">3. Soumettre au chef</span>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && isEtudiant && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">{editId ? 'Modifier le thème' : 'Nouveau thème'}</h3>
          {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 mb-4 text-sm">{error}</div>}
          <form onSubmit={handleSubmitForm} className="space-y-4">
            <div>
              <label className="block text-gray-600 text-sm font-medium mb-1">Titre <span className="text-red-400">*</span></label>
              <input type="text" value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                placeholder="Titre de votre thème" required />
            </div>
            <div>
              <label className="block text-gray-600 text-sm font-medium mb-1">Description <span className="text-red-400">*</span></label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                rows={4} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition resize-none"
                placeholder="Décrivez votre thème..." required />
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); }}
                className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:text-gray-700 transition">Annuler</button>
              <button type="submit" className="px-4 py-2 text-sm bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-lg transition">
                {editId ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal validation */}
      {selected && canValidate && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-gray-900 mb-1">Décision sur le thème</h3>
            <p className="text-gray-500 text-sm mb-2">{selected.titre}</p>
            {testsParTheme[selected.id]?.length > 0 && (
              <div className={`rounded-lg p-3 mb-4 text-sm font-medium ${testsParTheme[selected.id][0].taux_plagiat > seuilPlagiat
                ? 'bg-red-50 text-red-600 border border-red-200'
                : 'bg-green-50 text-green-700 border border-green-200'}`}>
                Dernier taux de plagiat : {testsParTheme[selected.id][0].taux_plagiat}%
                <span className="text-xs font-normal ml-2 opacity-70">
                  ({testsParTheme[selected.id].length} test{testsParTheme[selected.id].length > 1 ? 's' : ''} au total)
                </span>
              </div>
            )}
            <div className="mb-4">
              <label className="block text-gray-600 text-sm font-medium mb-1">Commentaire</label>
              <textarea value={commentaire} onChange={e => setCommentaire(e.target.value)} rows={3}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition resize-none"
                placeholder="Commentaire pour l'étudiant..." />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setSelected(null); setCommentaire(''); }}
                className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:text-gray-700 transition">Annuler</button>
              <button onClick={() => handleValider(selected.id, 'rejete')}
                className="px-4 py-2 text-sm bg-red-500 hover:bg-red-400 text-white font-medium rounded-lg transition">Rejeter</button>
              <button onClick={() => handleValider(selected.id, 'valide')}
                className="px-4 py-2 text-sm bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg transition">Valider</button>
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
          placeholder="Rechercher un thème..."
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
            <div className="w-10 h-10 mx-auto mb-3 text-gray-200">{Icons.theme}</div>
            Aucun thème trouvé.
          </div>
        ) : filtered.map(t => (
          <div key={t.id} className={`bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition ${t.statut === 'rejete' ? 'border-red-200' : 'border-gray-200'}`}>

            {isEtudiant && t.statut === 'rejete' && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 mb-3 text-xs">
                Votre thème a été rejeté. Veuillez le modifier pour le rendre conforme aux exigences.
                {t.commentaire_validation && <span className="block mt-1 font-medium">Commentaire : {t.commentaire_validation}</span>}
              </div>
            )}

            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statutBadge[t.statut]}`}>
                    {statutLabels[t.statut]}
                  </span>
                  {t.a_document && (
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                      Mémoire associé
                    </span>
                  )}
                </div>
                <h3 className="text-gray-900 font-semibold text-sm mb-2">{t.titre}</h3>
                {testsParTheme[t.id]?.length > 0 && (
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mb-2 border ${
                    testsParTheme[t.id][0].taux_plagiat > seuilPlagiat
                      ? 'bg-red-50 border-red-200 text-red-700'
                      : 'bg-green-50 border-green-200 text-green-700'
                  }`}>
                    <div className="w-3.5 h-3.5">{Icons.shield}</div>
                    <span className="text-xs font-medium">Taux de plagiat :</span>
                    <span className={`text-base font-bold ${
                      testsParTheme[t.id][0].taux_plagiat > seuilPlagiat ? 'text-red-600' : 'text-green-600'
                    }`}>{testsParTheme[t.id][0].taux_plagiat}%</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                      testsParTheme[t.id][0].taux_plagiat > seuilPlagiat ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
                    }`}>
                      {testsParTheme[t.id][0].taux_plagiat > seuilPlagiat ? '⚠ Au-dessus du seuil' : '✓ Sous le seuil'}
                    </span>
                  </div>
                )}
                <p className="text-gray-400 text-xs line-clamp-2 mb-1">{t.description}</p>
                <p className="text-gray-300 text-xs">
                  {new Date(t.date_soumission).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>

                {/* Historique tests */}
                <HistoriqueTests tests={testsParTheme[t.id]} seuil={seuilPlagiat} />
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">

                {isEtudiant && ['brouillon', 'rejete'].includes(t.statut) && (
                  <button onClick={() => handleEdit(t)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-medium rounded-lg transition border border-sky-100">
                    <div className="w-3.5 h-3.5">{Icons.check}</div>
                    Modifier
                  </button>
                )}

                {isEtudiant && t.statut === 'brouillon' && (
                  <button onClick={() => handleDelete(t.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg transition border border-red-100">
                    <div className="w-3.5 h-3.5">{Icons.logout}</div>
                    Supprimer
                  </button>
                )}

                {((isEtudiant && ['brouillon', 'rejete'].includes(t.statut)) ||
                  (canValidate && t.statut === 'soumis')) && (
                  <button onClick={() => handleTestPlagiat(t.id)} disabled={testLoading === t.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 text-xs font-medium rounded-lg transition border border-orange-100 disabled:opacity-50">
                    {testLoading === t.id
                      ? <div className="w-3.5 h-3.5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin"></div>
                      : <div className="w-3.5 h-3.5">{Icons.shield}</div>
                    }
                    Tester plagiat
                  </button>
                )}

                {isEtudiant && ['brouillon', 'rejete'].includes(t.statut) && (
                  <button onClick={() => handleSoumettre(t.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded-lg transition">
                    <div className="w-3.5 h-3.5">{Icons.check}</div>
                    Soumettre
                  </button>
                )}

                {canValidate && t.statut === 'soumis' && (
                  <button onClick={() => setSelected(t)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-medium rounded-lg transition border border-green-100">
                    <div className="w-3.5 h-3.5">{Icons.check}</div>
                    Décision
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
