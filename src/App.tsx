/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Players } from './components/Players';
import { Matches } from './components/Matches';
import { MyAvailability } from './components/MyAvailability';
import { GlobalSelectors } from './components/GlobalSelectors';

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={
              <>
                <GlobalSelectors />
                <Dashboard />
              </>
            } />
            <Route path="players" element={
              <>
                <GlobalSelectors />
                <Players />
              </>
            } />
            <Route path="matches" element={
              <>
                <GlobalSelectors />
                <Matches />
              </>
            } />
            <Route path="my-availability" element={
              <>
                <GlobalSelectors />
                <MyAvailability />
              </>
            } />
            <Route path="settings" element={
              <div className="p-8 text-center text-on-surface-variant">
                <h2 className="text-xl font-bold text-primary mb-4">Settings</h2>
                <p>Team configuration and export options coming soon.</p>
              </div>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppProvider>
  );
}
