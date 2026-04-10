import { useEffect, useState } from 'react';
import api from '../api';
import { Icons } from '../components/Icons';

export default function Notifications({ onRead }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('tous');

  const fetchNotifications = () => {
    setLoading(true);
    api.get('/notifications/').then(res => {
      setNotifications(res.data);
      setLoading(false);
    });
  };

  useEffect(() => { fetchNotifications(); }, []);

  const handleMarkRead = async (id) => {
    await api.patch(`/notifications/${id}/`, { lu: true });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, lu: true } : n));
    if (onRead) onRead();
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.lu);
    await Promise.all(unread.map(n => api.patch(`/notifications/${n.id}/`, { lu: true })));
    setNotifications(prev => prev.map(n => ({ ...n, lu: true })));
    if (onRead) onRead();
  };

  const nonLues = notifications.filter(n => !n.lu).length;

  const filtered = notifications.filter(n => {
    if (activeFilter === 'non_lues') return !n.lu;
    if (activeFilter === 'lues') return n.lu;
    return true;
  });

  const filters = [
    { key: 'tous', label: 'Toutes', count: notifications.length },
    { key: 'non_lues', label: 'Non lues', count: nonLues },
    { key: 'lues', label: 'Lues', count: notifications.filter(n => n.lu).length },
  ];

  return (
    <div className="space-y-5 max-w-3xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
          <p className="text-gray-400 text-sm">
            {nonLues > 0 ? `${nonLues} non lue(s)` : 'Tout est à jour'}
          </p>
        </div>
        {nonLues > 0 && (
          <button onClick={handleMarkAllRead}
            className="text-sm text-sky-600 hover:text-sky-500 font-medium transition">
            Tout marquer comme lu
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-2">
        {filters.map(f => (
          <button key={f.key} onClick={() => setActiveFilter(f.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition border
              ${activeFilter === f.key
                ? 'bg-sky-600 text-white border-sky-600'
                : 'bg-white text-gray-500 border-gray-200 hover:border-sky-300 hover:text-sky-600'}`}>
            {f.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeFilter === f.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            <div className="w-10 h-10 mx-auto mb-3 text-gray-200">{Icons.bell}</div>
            Aucune notification.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(n => (
              <div key={n.id}
                className={`flex items-start gap-4 px-5 py-4 transition hover:bg-gray-50 ${!n.lu ? 'bg-sky-50/50' : ''}`}>

                {/* Indicateur */}
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.lu ? 'bg-sky-500' : 'bg-gray-200'}`}></div>

                {/* Contenu */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!n.lu ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                    {n.message}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(n.date).toLocaleDateString('fr-FR', {
                      day: '2-digit', month: 'long', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>

                {/* Bouton marquer lu */}
                {!n.lu && (
                  <button onClick={() => handleMarkRead(n.id)}
                    className="shrink-0 text-xs text-sky-600 hover:text-sky-500 font-medium transition whitespace-nowrap">
                    Marquer lu
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
