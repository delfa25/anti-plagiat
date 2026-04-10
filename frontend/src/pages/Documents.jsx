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
  const [editDoc, setEditDoc] = useState(null);
  const [testLoading, setTestLoading] = useState(null);
  const [seuilPlagiat, setSeuilPlagiat] = useState(20);
  const [testInfo, setTestInfo] = useState('');

  const isEtudiant = currentUser.role === 'etudiant';
  const isChef = currentUser.role === 'chef';
  const isDirecteur = ['directeur', 'superadmin'].includes(currentUser.role);

  const fetchDocuments = () => {
    setLoading(true);
    api.get('/documents/').then(res => {
      setDocuments(res.data);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchDocuments();
    api.get('/parametres/valeur/seuil_plagiat/')
      .then(res => setSeuilPlagiat(Number(res.data.valeur) || 20))
      .catch(() => setSeuilPlagiat(20));
    if (isEtudiant) {
      api.get('/themes/').then(res => {
        // Uniquement les thèmes validés sans mémoire déjà associé
        const themesValides = res.data.filter(t => t.statut === 'valide' && !t.a_document);
        setThemes(themesValides);
      });
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
    setTestInfo('');
    try {
      const res = await api.post(`/plagiarism/lancer/${id}/`);
      const taux = typeof res?.data?.taux_plagiat === 'number' ? res.data.taux_plagiat : 0;
      setTestInfo(`Test plagiat termine: ${taux}%`);
      fetchDocuments();
    } catch {
      alert('Erreur lors du test de plagiat.');
    } finally {
      setTestLoading(null);
    }
  };

  const handleSoumettre = async (id) => {
    if (!window.confirm('Confirmer la soumission ? Vous ne pourrez plus modifier ce mémoire.')) return;
    try {
      await api.post(`/documents/${id}/soumettre/`);
      fetchDocuments();
    } catch {
      alert('Erreur lors de la soumission.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce mémoire ?')) return;
    try {
      await api.delete(`/documents/${id}/`);
      fetchDocuments();
    } catch {
      alert('Erreur lors de la suppression.');
    }
  };

  const handleEdit = (doc) => {
    setEditDoc(doc);
    setForm({ titre: doc.titre, theme: doc.theme, fichier: null });
    setShowForm(true);
    setError('');
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = new FormData();
      data.append('titre', form.titre);
      data.append('theme', form.theme);
      if (form.fichier) data.append('fichier', form.fichier);
      await api.patch(`/documents/${editDoc.id}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowForm(false);
      setEditDoc(null);
      setForm({ titre: '', theme: '', fichier: null });
      fetchDocuments();
    } catch {
      setError('Erreur lors de la modification.');
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

  // Ce que chaque rôle peut voir
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

  return (
    <div className="space-y-5 max-w-5xl">

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
            onClick={() => { setShowForm(true); setError(''); setEditDoc(null); setForm({ titre: '', theme: '', fichier: null }); }}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            <div className="w-4 h-4">{Icons.document}</div>
            Nouveau mémoire
          </button>
        )}
      </div>
      {isEtudiant && !canCreateDocument && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
          Vous avez deja un seul memoire autorise. Modifiez la soumission existante puis resoumettez-la.
        </div>
      )}
      {testInfo && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">
          {testInfo}
        </div>
      )}

      {/* Workflow info */}
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
            </div>
            <div>
              <label className="block text-gray-600 text-sm font-medium mb-1">Thème associé <span className="text-red-400">*</span></label>
              <select value={form.theme} onChange={e => setForm({ ...form, theme: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition" required>
                <option value="">Sélectionner un thème validé</option>
                {themes.map(t => <option key={t.id} value={t.id}>{t.titre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-gray-600 text-sm font-medium mb-1">Fichier PDF {!editDoc && <span className="text-red-400">*</span>}{editDoc && <span className="text-gray-400 font-normal">(laisser vide pour garder l'actuel)</span>}</label>
              <input type="file" accept=".pdf" onChange={e => setForm({ ...form, fichier: e.target.files[0] })}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition" />
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => { setShowForm(false); setEditDoc(null); }} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:text-gray-700 transition">Annuler</button>
              <button type="submit" className="px-4 py-2 text-sm bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-lg transition">{editDoc ? 'Enregistrer' : 'Uploader'}</button>
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
            {selected.taux_plagiat > 0 && (
              <div className={`rounded-lg p-3 mb-4 text-sm font-medium ${selected.taux_plagiat > seuilPlagiat ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                Taux de plagiat : {selected.taux_plagiat}%
              </div>
            )}
            <div className="mb-4">
              <label className="block text-gray-600 text-sm font-medium mb-1">Commentaire</label>
              <textarea value={commentaire} onChange={e => setCommentaire(e.target.value)} rows={3}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition resize-none"
                placeholder="Commentaire optionnel..." />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setSelected(null); setCommentaire(''); }} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:text-gray-700 transition">Annuler</button>
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

      {/* Liste */}
      <div className="space-y-3">
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
          <div key={d.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statutBadge[d.statut]}`}>
                    {statutLabels[d.statut]}
                  </span>
                  {d.taux_plagiat > 0 && (
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${d.taux_plagiat > seuilPlagiat ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                      Plagiat : {d.taux_plagiat}%
                    </span>
                  )}
                </div>
                <h3 className="text-gray-900 font-semibold text-sm mb-1">{d.titre}</h3>
                {d.commentaire_validation && (
                  <p className="text-gray-400 text-xs italic">"{d.commentaire_validation}"</p>
                )}
                <p className="text-gray-300 text-xs mt-1">
                  {new Date(d.date_soumission).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">

                {/* Modifier / Supprimer — étudiant sur brouillon/rejete */}
                {isEtudiant && ['brouillon', 'rejete', 'rejete_chef'].includes(d.statut) && (
                  <>
                    <button onClick={() => handleEdit(d)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-medium rounded-lg transition border border-sky-100">
                      <div className="w-3.5 h-3.5">{Icons.check}</div>
                      Modifier
                    </button>
                    {d.statut === 'brouillon' && (
                      <button onClick={() => handleDelete(d.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg transition border border-red-100">
                        <div className="w-3.5 h-3.5">{Icons.logout}</div>
                        Supprimer
                      </button>
                    )}
                  </>
                )}

                {/* Voir le fichier */}
                {getFileUrl(d.fichier) && (
                  <a href={getFileUrl(d.fichier)} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium rounded-lg transition border border-gray-200">
                    <div className="w-3.5 h-3.5">{Icons.document}</div>
                    Voir
                  </a>
                )}

                {/* Tester plagiat — étudiant sur brouillon, chef/directeur sur soumis/valide_chef */}
                {((isEtudiant && ['brouillon', 'rejete', 'rejete_chef'].includes(d.statut)) ||
                  (isChef && d.statut === 'soumis') ||
                  (isDirecteur && d.statut === 'valide_chef')) && (
                  <button onClick={() => handleTestPlagiat(d.id)} disabled={testLoading === d.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 text-xs font-medium rounded-lg transition border border-orange-100 disabled:opacity-50">
                    {testLoading === d.id
                      ? <div className="w-3.5 h-3.5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin"></div>
                      : <div className="w-3.5 h-3.5">{Icons.shield}</div>
                    }
                    Tester plagiat
                  </button>
                )}

                {/* Soumettre — étudiant depuis brouillon/rejete */}
                {isEtudiant && ['brouillon', 'rejete', 'rejete_chef'].includes(d.statut) && (
                  <button onClick={() => handleSoumettre(d.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded-lg transition">
                    <div className="w-3.5 h-3.5">{Icons.check}</div>
                    Soumettre
                  </button>
                )}

                {/* Valider — chef sur soumis, directeur sur valide_chef */}
                {isChef && d.statut === 'soumis' && (
                  <button onClick={() => setSelected(d)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-medium rounded-lg transition border border-green-100">
                    <div className="w-3.5 h-3.5">{Icons.check}</div>
                    Décision
                  </button>
                )}

                {isDirecteur && d.statut === 'valide_chef' && (
                  <button onClick={() => setSelected(d)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-medium rounded-lg transition border border-green-100">
                    <div className="w-3.5 h-3.5">{Icons.check}</div>
                    Décision finale
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
