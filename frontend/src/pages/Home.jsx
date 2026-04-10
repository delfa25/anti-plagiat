import { Link } from 'react-router-dom';
import { Icons } from '../components/Icons';

const features = [
  {
    icon: Icons.document,
    title: 'Soumission de thèmes',
    desc: 'Soumettez vos thèmes de mémoire en ligne et suivez leur statut en temps réel.',
  },
  {
    icon: Icons.shield,
    title: 'Détection de plagiat',
    desc: 'Analyse automatique du taux de similarité de vos documents avec les travaux existants.',
  },
  {
    icon: Icons.check,
    title: 'Validation en ligne',
    desc: 'Circuit de validation numérique par le chef de département et le directeur adjoint.',
  },
  {
    icon: Icons.bell,
    title: 'Notifications',
    desc: 'Recevez des notifications à chaque étape du traitement de vos travaux.',
  },
];

const steps = [
  { num: '01', title: 'Créez votre compte', desc: 'Inscrivez-vous avec votre email institutionnel.' },
  { num: '02', title: 'Soumettez votre thème', desc: 'Déposez votre thème ou mémoire sur la plateforme.' },
  { num: '03', title: 'Analyse automatique', desc: 'ScholarCheck analyse votre document pour détecter le plagiat.' },
  { num: '04', title: 'Validation', desc: 'Votre travail est validé par les responsables pédagogiques.' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-gray-800">

      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 text-sky-600">{Icons.shield}</div>
            <span className="font-bold text-sky-700 text-lg">ScholarCheck</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-gray-600 hover:text-sky-600 text-sm font-medium transition px-3 py-2">
              Connexion
            </Link>
            <Link to="/login" className="bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
              Commencer
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-sky-600 to-sky-700 text-white">
        <div className="max-w-6xl mx-auto px-6 py-24 flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1">
            <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-6 uppercase tracking-wide">
              Institut Burkinabè des Arts et Métiers
            </span>
            <h1 className="text-5xl font-bold leading-tight mb-6">
              La plateforme de<br />
              <span className="text-orange-300">détection de plagiat</span><br />
              de l'IBAM
            </h1>
            <p className="text-sky-100 text-lg mb-8 max-w-lg">
              ScholarCheck simplifie la soumission, l'analyse et la validation de vos thèmes et mémoires académiques.
            </p>
            <div className="flex items-center gap-4">
              <Link to="/login" className="bg-orange-500 hover:bg-orange-400 text-white font-semibold px-6 py-3 rounded-lg transition shadow-lg">
                Se connecter
              </Link>
            </div>
          </div>

          <div className="flex-1 flex justify-center">
            <div className="bg-white/10 backdrop-blur rounded-2xl p-8 border border-white/20 w-full max-w-sm">
              <div className="space-y-4">
                {['Thème soumis', 'Analyse en cours...', 'Taux de plagiat : 4%', 'Validé par le chef'].map((text, i) => (
                  <div key={i} className={`flex items-center gap-3 bg-white/10 rounded-lg px-4 py-3 ${i === 1 ? 'border border-orange-400/50' : ''}`}>
                    <div className={`w-2 h-2 rounded-full ${i < 3 ? 'bg-green-400' : 'bg-orange-400'}`}></div>
                    <span className="text-sm text-white">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-sky-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Tout ce dont vous avez besoin</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Une plateforme complète pour gérer le cycle de vie de vos travaux académiques.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition">
                <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center mb-4">
                  <div className="w-5 h-5 text-sky-600">{f.icon}</div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Comment ça fonctionne</h2>
            <p className="text-gray-500">Un processus simple et transparent en 4 étapes.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s, i) => (
              <div key={i} className="relative">
                <div className="text-5xl font-bold text-sky-100 mb-3">{s.num}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-6 right-0 w-8 h-0.5 bg-sky-200 translate-x-4"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-orange-500">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Prêt à commencer ?</h2>
          <p className="text-orange-100 mb-8">Rejoignez la plateforme ScholarCheck et simplifiez la gestion de vos travaux académiques.</p>
          <Link to="/login" className="bg-white text-orange-500 hover:bg-orange-50 font-semibold px-8 py-3 rounded-lg transition shadow-lg inline-block">
            Accéder à la plateforme
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 text-sky-500">{Icons.shield}</div>
            <span className="text-white font-semibold">ScholarCheck</span>
          </div>
          <p className="text-sm">© 2026 ScholarCheck — Institut Burkinabè des Arts et Métiers</p>
        </div>
      </footer>

    </div>
  );
}
