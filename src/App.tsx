import { Navigate, NavLink, Route, Routes } from 'react-router-dom';

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full">
      {/* Fixed top header */}
      <header className="fixed top-0 inset-x-0 h-14 bg-surface border-b border-border flex items-center px-2 gap-2 z-10">
        <span className="text-sm text-muted">[ placeholder ] avatar</span>
        <div className="flex-1 flex items-center">
          <span className="text-sm text-muted">[ placeholder ] search</span>
        </div>
      </header>

      {/* Main content area */}
      <main className="flex-1 pt-14 pb-16 overflow-y-auto">
        {children}
      </main>

      {/* Fixed bottom tab bar */}
      <nav className="fixed bottom-0 inset-x-0 h-16 bg-surface border-t border-border flex items-center justify-around z-10">
        <NavLink
          to="/maps"
          className={({ isActive }) =>
            `flex flex-col items-center px-3 py-1 text-xs ${isActive ? 'text-accent' : 'text-muted'}`
          }
        >
          Maps
        </NavLink>
        <NavLink
          to="/countryside"
          className={({ isActive }) =>
            `flex flex-col items-center px-3 py-1 text-xs ${isActive ? 'text-accent' : 'text-muted'}`
          }
        >
          Countryside
        </NavLink>
        <NavLink
          to="/coastal"
          className={({ isActive }) =>
            `flex flex-col items-center px-3 py-1 text-xs ${isActive ? 'text-accent' : 'text-muted'}`
          }
        >
          Coastal
        </NavLink>
        <NavLink
          to="/plan"
          className={({ isActive }) =>
            `flex flex-col items-center px-3 py-1 text-xs ${isActive ? 'text-accent' : 'text-muted'}`
          }
        >
          Plan
        </NavLink>
        <button className="flex flex-col items-center px-3 py-1 text-xs text-muted">
          Search [ placeholder ]
        </button>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/maps" replace />} />
        <Route path="/maps" element={<MapsPage />} />
        <Route path="/countryside" element={<CountrysidePage />} />
        <Route path="/coastal" element={<CoastalPage />} />
        <Route path="/plan" element={<PlanPage />} />
        <Route path="/entity/:type/:slug" element={<DetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}

function MapsPage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">[ placeholder ] Maps</h1>
    </div>
  );
}

function CountrysidePage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">[ placeholder ] Countryside</h1>
    </div>
  );
}

function CoastalPage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">[ placeholder ] Coastal</h1>
    </div>
  );
}

function PlanPage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">[ placeholder ] Plan</h1>
    </div>
  );
}

function DetailPage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">[ placeholder ] Detail</h1>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">[ placeholder ] Not Found</h1>
    </div>
  );
}
