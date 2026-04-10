import { useEffect, useState } from 'react';
import api from '../api';
import { Icons } from '../components/Icons';

const descriptions = {
  seuil_plagiat: 'Taux de similarité maximum autorisé (%). Au-delà, le document est signalé comme plagié.',
  ajout_auto_bibliotheque: 'Les documents validés définitivement sont automatiquement ajoutés à la bibliothèque de ressources.',
  ajout_manuel_bibliotheque: 'Le superadmin et le DA peuvent ajouter manuellement des ressources dans la bibliothèque.',
  plagiat_marqueurs_debut: 'Marqueurs de début de zone utile pour le test plagiat (séparer par |).',
  plagiat_marqueurs_fin: 'Marqueurs de fin de zone utile pour le test plagiat (séparer par |).',
  plagiat_bloc_debut: 'Début du bloc institutionnel à supprimer avant calcul.',
  plagiat_bloc_fin: 'Fin du bloc institutionnel à supprimer (séparer par |).',
  plagiat_stopwords_metier: 'Mots métier à ignorer dans le calcul TF-IDF (séparer par |).',
  plagiat_regex_exclusion_custom: 'Regex personnalisées à exclure avant calcul (séparer par |).',
};

const labels = {
  seuil_plagiat: 'Seuil de plagiat (%)',
  ajout_auto_bibliotheque: 'Ajout automatique à la bibliothèque',
  ajout_manuel_bibliotheque: 'Ajout manuel à la bibliothèque',
  plagiat_marqueurs_debut: 'Plagiat - Marqueurs début',
  plagiat_marqueurs_fin: 'Plagiat - Marqueurs fin',
  plagiat_bloc_debut: 'Plagiat - Bloc début',
  plagiat_bloc_fin: 'Plagiat - Bloc fin',
  plagiat_stopwords_metier: 'Plagiat - Stopwords métier',
  plagiat_regex_exclusion_custom: 'Plagiat - Regex custom',
};

export default function Parametres({ currentUser }) {
  const [parametres, setParametres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const canEdit = currentUser.role === 'superadmin' || currentUser.is_superuser ||
    (currentUser.role === 'directeur');

  useEffect(() => {
    api.get('/parametres/').then(res => {
      setParametres(res.data);
      setLoading(false);
    });
  }, []);

  const handleChange = (cle, valeur) => {
    setParametres(prev => prev.map(p => p.cle === cle ? { ...p, valeur } : p));
  };

  const handleSave = async (p) => {
    setSaving(p.cle);
    setSuccess('');
    setError('');
    try {
      await api.put(`/parametres/${p.cle}/`, { cle: p.cle, valeur: p.valeur, description: p.description });
      setSuccess(`Paramètre "${labels[p.cle] || p.cle}" mis à jour.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Erreur lors de la mise à jour.');
    } finally {
      setSaving(null);
    }
  };

  const renderInput = (p) => {
    const booleanKeys = ['ajout_auto_bibliotheque', 'ajout_manuel_bibliotheque'];

    if (p.cle === 'seuil_plagiat') {
      return (
        <div className="flex items-center gap-3">
          <input
            type="number"
            min="1"
            max="100"
            value={p.valeur}
            onChange={e => handleChange(p.cle, e.target.value)}
            disabled={!canEdit}
            className="w-24 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition disabled:opacity-50"
          />
          <span className="text-gray-500 text-sm font-medium">%</span>
          <div className={`h-2 flex-1 rounded-full bg-gray-100 overflow-hidden`}>
            <div
              className={`h-full rounded-full transition-all ${parseInt(p.valeur) <= 20 ? 'bg-green-400' : parseInt(p.valeur) <= 40 ? 'bg-yellow-400' : 'bg-red-400'}`}
              style={{ width: `${Math.min(parseInt(p.valeur) || 0, 100)}%` }}
            />
          </div>
        </div>
      );
    }

    if (booleanKeys.includes(p.cle)) {
      const isTrue = p.valeur === 'true';
      return (
        <button
          onClick={() => canEdit && handleChange(p.cle, isTrue ? 'false' : 'true')}
          disabled={!canEdit}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${isTrue ? 'bg-sky-600' : 'bg-gray-200'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isTrue ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      );
    }

    return (
      <textarea
        value={p.valeur}
        onChange={e => handleChange(p.cle, e.target.value)}
        disabled={!canEdit}
        rows={2}
        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition resize-y disabled:opacity-50"
      />
    );
  };

  return (
    <div className="space-y-5 max-w-3xl">

      <div>
        <h2 className="text-lg font-semibold text-gray-900">Paramètres système</h2>
        <p className="text-gray-400 text-sm">
          {canEdit ? 'Configurez les paramètres de la plateforme.' : 'Consultation des paramètres système.'}
        </p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {parametres.map(p => (
            <div key={p.cle} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h3 className="text-gray-900 font-semibold text-sm">{labels[p.cle] || p.cle}</h3>
                  <p className="text-gray-400 text-xs mt-0.5">{descriptions[p.cle] || p.description}</p>
                </div>
                {canEdit && (
                  <button
                    onClick={() => handleSave(p)}
                    disabled={saving === p.cle}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded-lg transition disabled:opacity-50"
                  >
                    {saving === p.cle
                      ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      : <div className="w-3.5 h-3.5">{Icons.check}</div>
                    }
                    Enregistrer
                  </button>
                )}
              </div>
              {renderInput(p)}
            </div>
          ))}
        </div>
      )}

      {!canEdit && (
        <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 text-sm text-sky-700">
          <div className="w-4 h-4 inline-block mr-2">{Icons.shield}</div>
          Seuls le Super Admin et le Directeur Adjoint peuvent modifier ces paramètres.
        </div>
      )}
    </div>
  );
}
