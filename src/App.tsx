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
import { Settings } from './components/Settings';
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
            <Route path="settings" element={
              <>
                <GlobalSelectors />
                <Settings />
              </>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppProvider>
  );
}
