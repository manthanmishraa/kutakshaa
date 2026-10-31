const logo = '/assets/KUTAKSH LOGO.png';

const footerLinks = [
  { path: '/', label: 'Home' },
  { path: '/platform', label: 'Platform' },
  { path: '/technology', label: 'Technology' },
  { path: '/privacy', label: 'Privacy' },
  { path: '/demo', label: 'Live Demo' },
  { path: '/assistant', label: 'Assistant' },
  { path: '/contact', label: 'Contact' },
];

export default function SiteFooter({ onNavigate }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mx-auto mt-8 w-full max-w-7xl px-4 pb-8 md:px-6 lg:px-8 xl:px-10">
      <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
              <img src={logo} alt="Kutaksha logo" className="h-8 w-auto object-contain" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Kutaksha</p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
                Privacy-preserving AI digital twin platform for preventive eldercare. Built for early intervention, not diagnosis.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <div className="flex flex-wrap gap-2">
              {footerLinks.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => onNavigate(item.path)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="text-xs font-medium text-slate-500">
              © {currentYear} Kutaksha. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
