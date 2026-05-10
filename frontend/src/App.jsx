import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Checkout from './pages/Checkout';
import ProtectedRoute from './components/ProtectedRoute';
import CustomerMenu from './pages/CustomerMenu';
import KitchenDisplay from './pages/KitchenDisplay';
import OwnerDashboard from './pages/OwnerDashboard';
import Payment from './pages/Payment';
import StaffLogin from './pages/StaffLogin';
import Success from './pages/Success';
import WaiterDashboard from './pages/WaiterDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CustomerMenu />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/success" element={<Success />} />
        <Route path="/staff-login" element={<StaffLogin />} />

        <Route element={<ProtectedRoute allowedRoles={['CHEF']} />}>
          <Route path="/kds" element={<KitchenDisplay />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['WAITER']} />}>
          <Route path="/waiter" element={<WaiterDashboard />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['OWNER', 'MANAGER']} />}>
          <Route path="/admin" element={<OwnerDashboard />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
