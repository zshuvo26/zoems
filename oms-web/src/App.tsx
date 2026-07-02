import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/layout/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import MarketPage from './pages/MarketPage'
import InstrumentDetailPage from './pages/InstrumentDetailPage'
import OrdersPage from './pages/OrdersPage'
import NewOrderPage from './pages/NewOrderPage'
import OrderDetailPage from './pages/OrderDetailPage'
import OrderSearchPage from './pages/OrderSearchPage'
import AlgoPage from './pages/AlgoPage'
import BasketPage from './pages/BasketPage'
import ParentOrdersPage from './pages/ParentOrdersPage'
import PortfolioPage from './pages/PortfolioPage'
import WatchlistPage from './pages/WatchlistPage'
import AlertsPage from './pages/AlertsPage'
import NotificationsPage from './pages/NotificationsPage'
import TemplatesPage from './pages/TemplatesPage'
import IpoPage from './pages/IpoPage'
import LedgerPage from './pages/LedgerPage'
import SettlementPage from './pages/SettlementPage'
import CompliancePage from './pages/CompliancePage'
import CorporateActionsPage from './pages/CorporateActionsPage'
import MarginPage from './pages/MarginPage'
import HolidaysPage from './pages/HolidaysPage'
import LatencyPage from './pages/LatencyPage'
import ProfitCalcPage from './pages/ProfitCalcPage'
import SettingsPage from './pages/SettingsPage'
import AccountsPage from './pages/AccountsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<DashboardPage />} />
          <Route path="market" element={<MarketPage />} />
          <Route path="market/:exchange/:symbol" element={<InstrumentDetailPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/new" element={<NewOrderPage />} />
          <Route path="orders/search" element={<OrderSearchPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="algo" element={<AlgoPage />} />
          <Route path="basket" element={<BasketPage />} />
          <Route path="parent-orders" element={<ParentOrdersPage />} />
          <Route path="portfolio" element={<PortfolioPage />} />
          <Route path="watchlist" element={<WatchlistPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="templates" element={<TemplatesPage />} />
          <Route path="ipo" element={<IpoPage />} />
          <Route path="ledger" element={<LedgerPage />} />
          <Route path="settlement" element={<SettlementPage />} />
          <Route path="compliance" element={<CompliancePage />} />
          <Route path="corporate-actions" element={<CorporateActionsPage />} />
          <Route path="margin" element={<MarginPage />} />
          <Route path="holidays" element={<HolidaysPage />} />
          <Route path="latency" element={<LatencyPage />} />
          <Route path="profit-calc" element={<ProfitCalcPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="accounts" element={<AccountsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
