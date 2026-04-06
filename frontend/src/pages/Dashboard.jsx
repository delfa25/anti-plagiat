import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Icons } from '../components/Icons';
import GestionUtilisateurs from './GestionUtilisateurs';
import Themes from './Themes';
import Documents from './Documents';

const menuItems = {
  superadmin: [
    { label: 'Tableau de bord', icon: Icons.home, key: 'home' },
    { label: 'Utilisateurs', icon: Icons.user, key: 'users' },
    { label: 'Thèmes', icon: Icons.theme, key: 'themes' },
    { label: 'Mémoires', icon: Icons.document, key: 'documents' },
    { label: 'Notifications', icon: Icons.bell, key: 'notifications' },
  ],
  directeur: [
    { label: 'Tableau de bord', icon: Icons.home, key: 'home' },
    { label: 'Utilisateurs', icon: Icons.user, key: 'users' },
    { label: 'Validations', icon: Icons.check, key: 'themes' },
    { label: 'Mémoires', icon: Icons.document, key: 'documents' },
    { label: 'Notifications', icon: Icons.bell, key: 'notifications' },
  ],
  chef: [
    { label: 'Tableau de bord', icon: Icons.home, key: 'home' },
    { label: 'Thèmes à valider', icon: Icons.check, key: 'themes' },
    { label: 'Mémoires à valider', icon: Icons.document, key: 'documents' },
    { label: 'Notifications', icon: Icons.bell, key: 'notifications' },
  ],
  etudiant: [
    { label: 'Tableau de bord', icon: Icons.home, key: 'home' },
    { label: 'Mes thèmes', icon: Icons.theme, key: 'themes' },
    { label: 'Mes mémoires', icon: Icons.document, key: 'documents' },
    { label: 'Notifications', icon: Icons.bell, key: 'notifications' },
  ],
};

const roleLabels = {
  superadmin: 'Super Admin',
  directeur: 'Directeur Adjoint',
  chef: 'Chef de département',
  etudiant: 'Étudiant',
};

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [active, setActive] = useState('home');
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/users/me/')
      .then(res => setUser(res.data))
      .catch(() => {
        localStorage.clear();
        navigate('/login');
      });
  }, [navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  if (!user) return (
    <div className="min-h-screen bg-sky-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const menu = menuItems[user.role] || menuItems.etudiant;
  const activeLabel = menu.find(m => m.key === active)?.label;

  return (
    <div className="min-h-screen bg-sky-50 flex text-sm">

      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-56'} bg-white border-r border-gray-200 flex flex-col transition-all duration-200 shrink-0 shadow-sm`}>

        <div className="h-14 flex items-center justify-between px-4 border-b border-gray-100">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 text-sky-600">{Icons.shield}</div>
              <span className="text-sky-700 font-bold text-base">ScholarCheck</span>
            </div>
          )}
          <button onClick={() => setCollapsed(!collapsed)} className="w-5 h-5 text-gray-400 hover:text-sky-600 transition ml-auto">
            {collapsed ? Icons.chevronRight : Icons.chevronLeft}
          </button>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {menu.map(item => (
            <button
              key={item.key}
              onClick={() => setActive(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition
                ${active === item.key
                  ? 'bg-sky-600 text-white'
                  : 'text-gray-500 hover:bg-sky-50 hover:text-sky-700'
                }`}
            >
              <div className="w-4 h-4 shrink-0">{item.icon}</div>
              {!collapsed && <span className="truncate font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-2 border-t border-gray-100 space-y-0.5">
          {!collapsed && (
            <div className="px-3 py-2">
              <p className="text-gray-800 font-medium truncate text-xs">{user.email}</p>
              <p className="text-gray-400 text-xs mt-0.5">{roleLabels[user.role]}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition"
          >
            <div className="w-4 h-4 shrink-0">{Icons.logout}</div>
            {!collapsed && <span className="font-medium">Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">

        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 shadow-sm">
          <h1 className="text-gray-800 font-semibold">{activeLabel}</h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-sky-700 bg-sky-100 px-2.5 py-1 rounded-full font-medium">
              {roleLabels[user.role]}
            </span>
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
              {user.email[0].toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          {active === 'home' && <HomeContent user={user} />}
          {active === 'users' && <GestionUtilisateurs currentUser={user} />}
          {active === 'themes' && <Themes currentUser={user} />}
          {active === 'documents' && <Documents currentUser={user} />}
          {active !== 'home' && active !== 'users' && active !== 'themes' && active !== 'documents' && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <div className="w-10 h-10 mb-3 text-gray-300">{Icons.document}</div>
              <p>Section en cours de développement</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function HomeContent({ user }) {
  const stats = [
    { label: 'Thèmes soumis', value: '0', icon: Icons.theme, color: 'text-sky-600', bg: 'bg-sky-50 border-sky-100' },
    { label: 'Mémoires soumis', value: '0', icon: Icons.document, color: 'text-orange-500', bg: 'bg-orange-50 border-orange-100' },
    { label: 'Notifications', value: '0', icon: Icons.bell, color: 'text-sky-600', bg: 'bg-sky-50 border-sky-100' },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-sky-600 rounded-xl p-6 text-white">
        <p className="text-sky-200 text-sm mb-1">Bienvenue sur la plateforme</p>
        <h2 className="text-xl font-bold">ScholarCheck</h2>
        <p className="text-sky-100 text-sm mt-1">{user.email} — {roleLabels[user.role] || user.role}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s, i) => (
          <div key={i} className={`${s.bg} border rounded-xl p-5`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-500 text-xs font-medium uppercase tracking-wide">{s.label}</span>
              <div className={`w-4 h-4 ${s.color}`}>{s.icon}</div>
            </div>
            <p className="text-3xl font-bold text-gray-800">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-gray-800 font-semibold mb-3">Activité récente</h3>
        <div className="border-t border-gray-100 pt-3">
          <p className="text-gray-400 text-sm text-center py-4">Aucune activité récente.</p>
        </div>
      </div>
    </div>
  );
}
