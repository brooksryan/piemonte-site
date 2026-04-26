import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import BottomTabBar from './components/BottomTabBar';
import SearchOverlay from './components/SearchOverlay';
import MapsPage from './pages/Maps';
import CountrysidePage from './pages/Countryside';
import CoastalPage from './pages/Coastal';
import PlanPage from './pages/Plan';
import DetailPage from './pages/Detail';
import NotFoundPage from './pages/NotFound';

export default function App() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <Header onOpenSearch={() => setSearchOpen(true)} />
      <main className="pt-14 pb-20 min-h-screen">
        <Routes>
          <Route path="/" element={<Navigate to="/maps" replace />} />
          <Route path="/maps" element={<MapsPage />} />
          <Route path="/countryside" element={<CountrysidePage />} />
          <Route path="/coastal" element={<CoastalPage />} />
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/entity/:type/:slug" element={<DetailPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <BottomTabBar onOpenSearch={() => setSearchOpen(true)} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
