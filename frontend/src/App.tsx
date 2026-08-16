import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ThemeProvider } from './theme/ThemeContext';
import RequireAuth from './auth/RequireAuth';
import AppShell from './layout/AppShell';
import Login from './pages/Login';
import Launchpad from './pages/Launchpad';
import PartnersPage from './pages/partners/PartnersPage';
import ProductsPage from './pages/inventory/ProductsPage';
import BomPage from './pages/inventory/BomPage';
import ProductionOrdersPage from './pages/inventory/ProductionOrdersPage';
import StockMovementsPage from './pages/inventory/StockMovementsPage';
import PurchaseOrdersPage from './pages/purchasing/PurchaseOrdersPage';
import SalesOrdersPage from './pages/sales/SalesOrdersPage';
import FinanceEntriesPage from './pages/finance/FinanceEntriesPage';
import CashFlowPage from './pages/finance/CashFlowPage';
import DrePage from './pages/finance/DrePage';
import UsersPage from './pages/admin/UsersPage';
import MyAccountPage from './pages/account/MyAccountPage';
import SecurityCompliancePage from './pages/security/SecurityCompliancePage';
import SystemStatusPage from './pages/system/SystemStatusPage';
import BusinessLineOverviewPage from './pages/BusinessLineOverviewPage';
import ReceiptPage from './pages/receipts/ReceiptPage';
import CompanySettingsPage from './pages/admin/CompanySettingsPage';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<RequireAuth />}>
            <Route path="/purchase-orders/:id/receipt" element={<ReceiptPage kind="purchase" />} />
            <Route path="/sales-orders/:id/receipt" element={<ReceiptPage kind="sales" />} />
            <Route element={<AppShell />}>
              <Route path="/" element={<Launchpad />} />
              <Route path="/lines/:key" element={<BusinessLineOverviewPage />} />
              <Route path="/partners" element={<PartnersPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/:productId/bom" element={<BomPage />} />
              <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
              <Route path="/sales-orders" element={<SalesOrdersPage />} />
              <Route path="/production-orders" element={<ProductionOrdersPage />} />
              <Route path="/inventory/movements" element={<StockMovementsPage />} />
              <Route path="/finance/entries" element={<FinanceEntriesPage />} />
              <Route path="/finance/cash-flow" element={<CashFlowPage />} />
              <Route path="/finance/dre" element={<DrePage />} />
              <Route path="/admin/users" element={<UsersPage />} />
              <Route path="/admin/company-settings" element={<CompanySettingsPage />} />
              <Route path="/security/compliance" element={<SecurityCompliancePage />} />
              <Route path="/system/status" element={<SystemStatusPage />} />
              <Route path="/account" element={<MyAccountPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
