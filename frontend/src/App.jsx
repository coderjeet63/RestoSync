import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CustomerMenu from './pages/CustomerMenu';
import KitchenDisplay from './pages/KitchenDisplay';
import OwnerDashboard from './pages/OwnerDashboard';
import Checkout from './pages/Checkout';
import Success from './pages/Success';
import Payment from './pages/Payment';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CustomerMenu />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/payment"  element={<Payment />} />
        <Route path="/success"  element={<Success />} />
        <Route path="/kds" element={<KitchenDisplay />} />
        <Route path="/admin" element={<OwnerDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;