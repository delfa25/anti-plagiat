import { useEffect, useState } from 'react';
import api from '../api';
import { Icons } from '../components/Icons';

const statutBadge = {
  brouillon: 'bg-gray-100 text-gray-500',
  soumis: 'bg-blue-100 text-blue-700',
  valide_chef: 'bg-yellow-100 text-yellow-700',
  rejete_chef: 'bg-red-100 text-red-600',
  valide: 'bg-green-100 text-green-700',
  rejete: 'bg-red-100 text-red-600',
};

const statutLabels = {
  brouillon: 'Brouillon',
  soumis: 'Soumis',
  valide_chef: 'Validé chef',
  rejete_chef: 'Rejeté chef',
  valide: 'Validé',
  rejete: 'Rejeté',
};

function similariteColor(score) {
  if (score >= 70) return 'text-red-600 bg-red-50 border-red-200';
  if (score >= 40) return 'text-orange-600 bg-orange-50 border-orange-200';
  return 'text-yellow-700 bg-yellow-50 border-yellow-200';
}

function PassagesSuspects({ test, seuil }) {
  if (!test || test.taux_plagiat <= seuil) return null;
  const phrases = test.phrases_suspectes || [];

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-3.5 h-3.5 text-red-500">{Icons.shield}</div>
        <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">
          Zones similaires détectées
        </span>
        {test.source_titre && (
          <span className="text-xs text-gray-400 ml-auto italic">
            Source : <span className="font-medium text-gray-600">{test.source_titre}</span>
          </span>
        )}
      </div>
      {phrases.length === 0 ? (
        <p className="text-xs text-gray-400 italic">Aucun passage suspect identifié.</p>
      ) : (
        <div className="space-y-2">
          {phrases.map((p, i) => (
            <div key={i} className={`rounded-lg border p-3 text-xs ${similariteColor(p.similarite)}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">Passage #{i + 1}</span>
                <span className={`px-2 py-0.5 rounded-full font-bold border text-xs ${similariteColor(p.similarite)}`}>
                  {p.similarite}% similaire
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="font-medium text-gray-500 mb-1 uppercase text-[10px] tracking-wide">Votre texte</p>
                  <p className="leading-relaxed text-gray-700 bg-white/60 rounded p-2">{p.phrase}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-500 mb-1 uppercase text-[10px] tracking-wide">Texte source</p>
                  <p className="leading-relaxed text-gray-600 bg-white/60 rounded p-2 italic">{p.passage_source || '—'}</p>
                </div>
              </div>
              {/* Suggestion de reformulation */}
              <div className="mt-2 pt-2 border-t border-current/20">
                <p className="font-medium text-gray-500 mb-1 uppercase text-[10px] tracking-wide">💡 Suggestion</p>
                <p className="text-gray-500 italic">Reformulez ce passage en utilisant vos propres mots, en citant la source si nécessaire.</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoriqueTests({ tests, seuil, onSelectTest, selectedTestId }) {
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
        — Dernier :{' '}
        <span className={`font-bold ${dernier.taux_plagiat > seuil ? 'text-red-600' : 'text-green-600'}`}>
          {dernier.taux_plagiat}%
        </span>
        <span className="ml-1 text-gray-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-2 space-y-1.5">
          {tests.map((t, i) => (
            <button
              key={t.id}
              onClick={() => onSelectTest && onSelectTest(t)}
              className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs border transition text-left
                ${t.id === selectedTestId ? 'ring-2 ring-sky-400' : ''}
                ${t.taux_plagiat > seuil
                  ? 'bg-red-50 border-red-100 text-red-700 hover:bg-red-100'
                  : 'bg-green-50 border-green-100 text-green-700 hover:bg-green-100'}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-gray-400 font-medium">#{tests.length - i}</span>
                <span className={`font-bold text-sm ${t.taux_plagiat > seuil ? 'text-red-600' : 'text-green-600'}`}>
                  {t.taux_plagiat}%
                </span>
                <span className={`px-2 py-0.5 rounded-full font-medium ${
                  t.taux_plagiat > seuil ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
                }`}>
                  {t.taux_plagiat > seuil ? '⚠ Au-dessus du seuil' : '✓ Sous le seuil'}
                </span>
                {t.taux_plagiat > seuil && t.phrases_suspectes?.length > 0 && (
                  <span className="text-xs text-red-400 underline">Voir zones</span>
                )}
              </div>
              <div className="text-gray-400 text-right">
                <p>{new Date(t.date_test).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              </div>
            </button>
          ))}
          <p className="text-xs text-gray-400 pt-1">Seuil configuré : {seuil}%</p>
        </div>
      )}
    </div>
  );
}

export default function Documents({ currentUser }) {
  const [documents, setDocuments] = useState([]);
  const [themeValide, setThemeValide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ titre: '', fichier: null });
  const [error, setError] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [selected, setSelected] = useState(null);
  const [commentaire, setCommentaire] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('tous');
  const [editDoc, setEditDoc] = useState(null);
  const [testLoading, setTestLoading] = useState(null);
  const [seuilPlagiat, setSeuilPlagiat] = useState(20);
  const [testsParDocument, setTestsParDocument] = useState({});
  const [detailDoc, setDetailDoc] = useState(null);
  const [detailTest, setDetailTest] = useState(null);

  const isEtudiant = currentUser.role === 'etudiant';
  const isChef = currentUser.role === 'chef';
  const isDirecteur = ['directeur', 'superadmin'].includes(currentUser.role);

  const fetchTests = () => {
    api.get('/plagiarism/').then(res => {
      const map = {};
      res.data.forEach(t => {
        if (!map[t.document]) map[t.document] = [];
        map[t.document].push(t);
      });
      Object.keys(map).forEach(k => {
        map[k].sort((a, b) => new Date(b.date_test) - new Date(a.date_test));
      });
      setTestsParDocument(map);
    }).catch(() => {});
  };

  const fetchDocuments = () => {
    setLoading(true);
    api.get('/documents/').then(res => {
      setDocuments(res.data);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchDocuments();
    fetchTests();
    api.get('/parametres/valeur/seuil_plagiat/')
      .then(res => setSeuilPlagiat(Number(res.data.valeur) || 20))
      .catch(() => setSeuilPlagiat(20));
    if (isEtudiant) {
      api.get('/themes/').then(res => {
        const valide = res.data.find(t => t.statut === 'valide');
        setThemeValide(valide || null);
      }).catch(() => {});
    }
  }, [isEtudiant]);

  // Mettre à jour le panneau détail si les tests changent
  useEffect(() => {
    if (detailDoc && testsParDocument[detailDoc.id]) {
      const tests = testsParDocument[detailDoc.id];
      if (!detailTest || !tests.find(t => t.id === detailTest.id)) {
        setDetailTest(tests[0] || null);
      }
    }
  }, [testsParDocument, detailDoc]);

  const handleFichierChange = async (e) => {
    const fichier = e.target.files[0];
    if (!fichier) { setForm({ ...form, fichier: null }); return; }
    setForm({ ...form, fichier });
    if (isEtudiant && !editDoc) {
      setExtracting(true);
      try {
        const data = new FormData();
        data.append('fichier', fichier);
        const res = await api.post('/documents/extraire-infos/', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (res.data.titre) setForm(f => ({ ...f, titre: res.data.titre }));
      } catch {} finally { setExtracting(false); }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.fichier) { setError('Veuillez sélectionner un fichier PDF.'); return; }
    try {
      const data = new FormData();
      data.append('titre', form.titre);
      data.append('fichier', form.fichier);
      await api.post('/documents/', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowForm(false);
      setForm({ titre: '', fichier: null });
      fetchDocuments();
    } catch { setError('Erreur lors de la soumission.'); }
  };

  const handleTestPlagiat = async (id) => {
    setTestLoading(id);
    try {
      await api.post(`/plagiarism/lancer/${id}/`);
      fetchDocuments();
      fetchTests();
    } catch { alert('Erreur lors du test de plagiat.'); }
    finally { setTestLoading(null); }
  };

  const handleSoumettre = async (id) => {
    if (!window.confirm('Confirmer la soumission ? Vous ne pourrez plus modifier ce mémoire.')) return;
    try { await api.post(`/documents/${id}/soumettre/`); fetchDocuments(); }
    catch { alert('Erreur lors de la soumission.'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce mémoire ?')) return;
    try {
      await api.delete(`/documents/${id}/`);
      if (detailDoc?.id === id) { setDetailDoc(null); setDetailTest(null); }
      fetchDocuments();
    } catch { alert('Erreur lors de la suppression.'); }
  };

  const handleEdit = (doc) => {
    setEditDoc(doc);
    setForm({ titre: doc.titre, fichier: null });
    setShowForm(true);
    setError('');
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = new FormData();
      data.append('titre', form.titre);
      if (form.fichier) data.append('fichier', form.fichier);
      await api.patch(`/documents/${editDoc.id}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowForm(false); setEditDoc(null); setForm({ titre: '', fichier: null });
      fetchDocuments();
    } catch { setError('Erreur lors de la modification.'); }
  };

  const handleValider = async (id, statut) => {
    try {
      await api.patch(`/documents/${id}/`, { statut, commentaire_validation: commentaire });
      setSelected(null); setCommentaire('');
      fetchDocuments();
    } catch { alert('Erreur lors de la validation.'); }
  };

  const handleSelectDoc = (doc) => {
    if (detailDoc?.id === doc.id) { setDetailDoc(null); setDetailTest(null); return; }
    setDetailDoc(doc);
    const tests = testsParDocument[doc.id];
    setDetailTest(tests?.[0] || null);
  };

  const filters = [
    { key: 'tous', label: 'Tous', count: documents.length },
    ...(isEtudiant ? [
      { key: 'brouillon', label: 'Brouillons', count: documents.filter(d => d.statut === 'brouillon').length },
      { key: 'soumis', label: 'Soumis', count: documents.filter(d => d.statut === 'soumis').length },
    ] : []),
    { key: 'valide_chef', label: 'Validés chef', count: documents.filter(d => d.statut === 'valide_chef').length },
    { key: 'valide', label: 'Validés', count: documents.filter(d => d.statut === 'valide').length },
    { key: 'rejete', label: 'Rejetés', count: documents.filter(d => ['rejete', 'rejete_chef'].includes(d.statut)).length },
  ];

  const filtered = documents.filter(d => {
    const matchFilter = activeFilter === 'tous' || d.statut === activeFilter ||
      (activeFilter === 'rejete' && ['rejete', 'rejete_chef'].includes(d.statut));
    const matchSearch = d.titre.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const visibleDocs = filtered.filter(d => {
    if (isEtudiant) return true;
    if (isChef) return ['soumis', 'valide_chef', 'rejete_chef'].includes(d.statut);
    if (isDirecteur) return ['valide_chef', 'valide', 'rejete'].includes(d.statut);
    return true;
  });

  const getFileUrl = (fichier) => {
    if (!fichier) return null;
    return fichier.startsWith('http') ? fichier : `http://localhost:8000${fichier}`;
  };

  const canCreateDocument = !isEtudiant || documents.length === 0;
  const dernierTest = detailDoc ? testsParDocument[detailDoc.id]?.[0] : null;

  return (
    <div className="flex flex-col h-full space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {isEtudiant ? 'Mes mémoires' : isChef ? 'Mémoires à valider (Chef)' : 'Mémoires à valider (Directeur)'}
          </h2>
          <p className="text-gray-400 text-sm">{visibleDocs.length} mémoire(s)</p>
        </div>
        {isEtudiant && canCreateDocument && (
          <button
            onClick={() => { setShowForm(true); setError(''); setEditDoc(null); setForm({ titre: '', fichier: null }); }}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            <div className="w-4 h-4">{Icons.document}</div>
            Nouveau mémoire
          </button>
        )}
      </div>

      {isEtudiant && !canCreateDocument && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
          Vous avez déjà un mémoire. Modifiez la soumission existante puis resoumettez-la.
        </div>
      )}

      {isEtudiant && (
        <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 text-sm text-sky-700">
          <p className="font-medium mb-1">Workflow de soumission</p>
          <div className="flex items-center gap-2 flex-wrap text-xs text-sky-600">
            <span className="bg-white border border-sky-200 px-2 py-1 rounded">1. Uploader le mémoire</span>
            <span>→</span>
            <span className="bg-white border border-sky-200 px-2 py-1 rounded">2. Tester le plagiat</span>
            <span>→</span>
            <span className="bg-white border border-sky-200 px-2 py-1 rounded">3. Soumettre au chef</span>
          </div>
        </div>
      )}

      {/* Form upload */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">{editDoc ? 'Modifier le mémoire' : 'Uploader un mémoire'}</h3>
          {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 mb-4 text-sm">{error}</div>}
          <form onSubmit={editDoc ? handleUpdate : handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-600 text-sm font-medium mb-1">Titre <span className="text-red-400">*</span></label>
              <input type="text" value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                placeholder="Titre du mémoire" required />
              {extracting && (
                <div className="mt-1 flex items-center gap-2 text-xs text-blue-600">
                  <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                  Extraction du titre en cours...
                </div>
              )}
            </div>
            <div>
              <label className="block text-gray-600 text-sm font-medium mb-1">Thème associé</label>
              {themeValide
                ? <div className="w-full bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700 font-medium">✓ {themeValide.titre}</div>
                : <div className="w-full bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-700">Aucun thème validé. Faites valider votre thème avant de déposer un mémoire.</div>
              }
            </div>
            <div>
              <label className="block text-gray-600 text-sm font-medium mb-1">
                Fichier PDF {!editDoc && <span className="text-red-400">*</span>}
                {editDoc && <span className="text-gray-400 font-normal"> (laisser vide pour garder l'actuel)</span>}
              </label>
              <input type="file" accept=".pdf" onChange={handleFichierChange}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition" />
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => { setShowForm(false); setEditDoc(null); }}
                className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:text-gray-700 transition">Annuler</button>
              <button type="submit" className="px-4 py-2 text-sm bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-lg transition">
                {editDoc ? 'Enregistrer' : 'Uploader'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal validation */}
      {selected && (isChef || isDirecteur) && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-gray-900 mb-1">
              {isChef ? 'Décision du chef de département' : 'Décision du directeur adjoint'}
            </h3>
            <p className="text-gray-500 text-sm mb-3">{selected.titre}</p>
            {testsParDocument[selected.id]?.length > 0 && (
              <div className={`rounded-lg p-3 mb-4 text-sm font-medium ${testsParDocument[selected.id][0].taux_plagiat > seuilPlagiat ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                Taux de plagiat : {testsParDocument[selected.id][0].taux_plagiat}%
              </div>
            )}
            <div className="mb-4">
              <label className="block text-gray-600 text-sm font-medium mb-1">Commentaire</label>
              <textarea value={commentaire} onChange={e => setCommentaire(e.target.value)} rows={3}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition resize-none"
                placeholder="Commentaire optionnel..." />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setSelected(null); setCommentaire(''); }}
                className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:text-gray-700 transition">Annuler</button>
              <button onClick={() => handleValider(selected.id, isChef ? 'rejete_chef' : 'rejete')}
                className="px-4 py-2 text-sm bg-red-500 hover:bg-red-400 text-white font-medium rounded-lg transition">Rejeter</button>
              <button onClick={() => handleValider(selected.id, isChef ? 'valide_chef' : 'valide')}
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
          placeholder="Rechercher un mémoire..."
          className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition shadow-sm" />
      </div>

      {/* Layout 2 colonnes */}
      <div className="flex gap-4 min-h-0 flex-1">

        {/* Liste */}
        <div className={`space-y-3 overflow-auto ${detailDoc ? 'w-1/2' : 'w-full'} transition-all duration-200`}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : visibleDocs.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400 text-sm shadow-sm">
              <div className="w-10 h-10 mx-auto mb-3 text-gray-200">{Icons.document}</div>
              Aucun mémoire trouvé.
            </div>
          ) : visibleDocs.map(d => (
            <div
              key={d.id}
              onClick={() => handleSelectDoc(d)}
              className={`bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition cursor-pointer
                ${detailDoc?.id === d.id ? 'border-sky-400 ring-2 ring-sky-200' : 'border-gray-200'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statutBadge[d.statut]}`}>
                      {statutLabels[d.statut]}
                    </span>
                    {testsParDocument[d.id]?.length > 0 && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                        testsParDocument[d.id][0].taux_plagiat > seuilPlagiat
                          ? 'bg-red-50 border-red-200 text-red-600'
                          : 'bg-green-50 border-green-200 text-green-600'
                      }`}>
                        {testsParDocument[d.id][0].taux_plagiat > seuilPlagiat ? '⚠' : '✓'} {testsParDocument[d.id][0].taux_plagiat}%
                      </span>
                    )}
                  </div>
                  <h3 className="text-gray-900 font-semibold text-sm truncate">{d.titre}</h3>
                  {d.commentaire_validation && (
                    <p className="text-gray-400 text-xs italic mt-1 line-clamp-1">"{d.commentaire_validation}"</p>
                  )}
                  <p className="text-gray-300 text-xs mt-1">
                    {new Date(d.date_soumission).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                  {getFileUrl(d.fichier) && (
                    <a href={getFileUrl(d.fichier)} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 px-2 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium rounded-lg border border-gray-200 transition">
                      <div className="w-3 h-3">{Icons.document}</div> Voir
                    </a>
                  )}
                  {((isEtudiant && ['brouillon', 'rejete', 'rejete_chef'].includes(d.statut)) ||
                    (isChef && d.statut === 'soumis') ||
                    (isDirecteur && d.statut === 'valide_chef')) && (
                    <button onClick={() => handleTestPlagiat(d.id)} disabled={testLoading === d.id}
                      className="flex items-center gap-1 px-2 py-1 bg-orange-50 hover:bg-orange-100 text-orange-600 text-xs font-medium rounded-lg border border-orange-100 transition disabled:opacity-50">
                      {testLoading === d.id
                        ? <div className="w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin"></div>
                        : <div className="w-3 h-3">{Icons.shield}</div>
                      }
                      Test
                    </button>
                  )}
                  {isEtudiant && ['brouillon', 'rejete', 'rejete_chef'].includes(d.statut) && (
                    <>
                      <button onClick={() => handleEdit(d)}
                        className="flex items-center gap-1 px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-medium rounded-lg border border-sky-100 transition">
                        <div className="w-3 h-3">{Icons.check}</div> Éditer
                      </button>
                      <button onClick={() => handleSoumettre(d.id)}
                        className="flex items-center gap-1 px-2 py-1 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded-lg transition">
                        <div className="w-3 h-3">{Icons.check}</div> Soumettre
                      </button>
                    </>
                  )}
                  {isEtudiant && d.statut === 'brouillon' && (
                    <button onClick={() => handleDelete(d.id)}
                      className="flex items-center gap-1 px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg border border-red-100 transition">
                      <div className="w-3 h-3">{Icons.logout}</div> Suppr.
                    </button>
                  )}
                  {isChef && d.statut === 'soumis' && (
                    <button onClick={() => setSelected(d)}
                      className="flex items-center gap-1 px-2 py-1 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-medium rounded-lg border border-green-100 transition">
                      <div className="w-3 h-3">{Icons.check}</div> Décision
                    </button>
                  )}
                  {isDirecteur && d.statut === 'valide_chef' && (
                    <button onClick={() => setSelected(d)}
                      className="flex items-center gap-1 px-2 py-1 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-medium rounded-lg border border-green-100 transition">
                      <div className="w-3 h-3">{Icons.check}</div> Décision
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Panneau détail */}
        {detailDoc && (
          <div className="w-1/2 bg-white border border-gray-200 rounded-xl shadow-sm overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between z-10">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm truncate max-w-xs">{detailDoc.titre}</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${statutBadge[detailDoc.statut]}`}>
                    {statutLabels[detailDoc.statut]}
                  </span>
                </p>
              </div>
              <button onClick={() => { setDetailDoc(null); setDetailTest(null); }}
                className="text-gray-400 hover:text-gray-600 text-lg transition">✕</button>
            </div>

            <div className="p-5 space-y-4">
              {/* Dernier test résumé */}
              {dernierTest ? (
                <div className={`rounded-xl border p-4 ${dernierTest.taux_plagiat > seuilPlagiat ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Dernier test plagiat</span>
                    <span className={`text-2xl font-bold ${dernierTest.taux_plagiat > seuilPlagiat ? 'text-red-600' : 'text-green-600'}`}>
                      {dernierTest.taux_plagiat}%
                    </span>
                  </div>
                  <p className={`text-xs font-medium ${dernierTest.taux_plagiat > seuilPlagiat ? 'text-red-500' : 'text-green-600'}`}>
                    {dernierTest.taux_plagiat > seuilPlagiat ? `⚠ Dépasse le seuil (${seuilPlagiat}%)` : `✓ Sous le seuil (${seuilPlagiat}%)`}
                  </p>
                  {dernierTest.source_titre && (
                    <p className="text-xs text-gray-500 mt-1">Source principale : <span className="font-medium">{dernierTest.source_titre}</span></p>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center text-gray-400 text-sm">
                  Aucun test de plagiat effectué.
                </div>
              )}

              {/* Zones similaires */}
              {dernierTest && dernierTest.taux_plagiat > seuilPlagiat && (
                <PassagesSuspects test={dernierTest} seuil={seuilPlagiat} />
              )}

              {/* Historique */}
              <HistoriqueTests
                tests={testsParDocument[detailDoc.id]}
                seuil={seuilPlagiat}
                onSelectTest={setDetailTest}
                selectedTestId={detailTest?.id}
              />

              {/* Test sélectionné dans l'historique */}
              {detailTest && detailTest.id !== testsParDocument[detailDoc.id]?.[0]?.id && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Test sélectionné</p>
                  <PassagesSuspects test={detailTest} seuil={seuilPlagiat} />
                </div>
              )}

              {/* Commentaire de validation */}
              {detailDoc.commentaire_validation && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs font-semibold text-amber-700 mb-1">Commentaire de validation</p>
                  <p className="text-sm text-amber-800 italic">"{detailDoc.commentaire_validation}"</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
