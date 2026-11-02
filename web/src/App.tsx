import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/context/auth'
import AdminLayout from '@/pages/admin/AdminLayout'
import DashboardPage from '@/pages/admin/DashboardPage'
import FlavorsPage from '@/pages/admin/FlavorsPage'
import LoginPage from '@/pages/admin/LoginPage'
import OrderDetailPage from '@/pages/admin/OrderDetailPage'
import PixPage from '@/pages/admin/PixPage'
import PricingPage from '@/pages/admin/PricingPage'
import NotFoundPage from '@/pages/NotFoundPage'
import OrderPage from '@/pages/order/OrderPage'
import TrackingPage from '@/pages/order/TrackingPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/pedido" replace />} />
          <Route path="/pedido" element={<OrderPage />} />
          <Route path="/pedido/:codigo" element={<TrackingPage />} />

          <Route path="/admin/login" element={<LoginPage />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="pedidos/:codigo" element={<OrderDetailPage />} />
            <Route path="sabores" element={<FlavorsPage />} />
            <Route path="precos" element={<PricingPage />} />
            <Route path="pix" element={<PixPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
