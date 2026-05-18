import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ConfigProvider } from './context/ConfigContext';
import Login from './pages/Login';
import Register from './pages/Register';
import SuperAdminDashboard from './pages/super-admin/SuperAdminDashboard';
import FeatureToggles from './pages/super-admin/FeatureToggles';
import ModuleRegistry from './pages/super-admin/ModuleRegistry';
import LayoutEditor from './pages/super-admin/LayoutEditor';
import Builder from './components/builder/Builder';
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageDoctors from './pages/admin/ManageDoctors';
import DoctorProfile from './pages/admin/DoctorProfile';
import ManagePharmacies from './pages/admin/ManagePharmacies';
import ManagePharmacists from './pages/admin/ManagePharmacists';
import PharmacyRegistration from './pages/admin/PharmacyRegistration';
import ManagePatients from './pages/admin/ManagePatients';
import PatientProfile from './pages/admin/PatientProfile';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import DoctorPatients from './pages/doctor/DoctorPatients';
import DoctorAppointments from './pages/doctor/DoctorAppointments';
import PrescriptionList from './pages/doctor/prescriptions/PrescriptionList';
import PrescriptionDetail from './pages/doctor/prescriptions/PrescriptionDetail';
import PrescriptionPrint from './pages/doctor/prescriptions/PrescriptionPrint';
import PatientDashboard from './pages/patient/PatientDashboard';
import DoctorDiscovery from './pages/patient/DoctorDiscovery';
import BookAppointment from './pages/patient/BookAppointment';
import Prescriptions from './pages/patient/Prescriptions';
import LabReports from './pages/patient/LabReports';
import Billing from './pages/patient/Billing';
import Chat from './pages/patient/Chat';
import MyProfile from './pages/patient/MyProfile';
import StaffDashboard from './pages/staff/StaffDashboard';
import PharmacyDashboard from './pages/pharmacy/PharmacyDashboard';
import PrescriptionQueue from './pages/pharmacy/PrescriptionQueue';
import MedicineInventory from './pages/pharmacy/MedicineInventory';
import StockAlerts from './pages/pharmacy/StockAlerts';
import POSInterface from './pages/pharmacy/POSInterface';
import GsrInventorySuite from './pages/pharmacy/GsrInventorySuite';
import PatientRegistration from './pages/staff/PatientRegistration';
import PatientList from './pages/staff/PatientList';
import PatientCheckIn from './pages/staff/PatientCheckIn';
import DigitalHealthCards from './pages/staff/DigitalHealthCards';
import HealthIdScanner from './pages/staff/HealthIdScanner';
import TelemedicineRoom from './pages/TelemedicineRoom';
import ProtectedRoute from './components/ProtectedRoute';
import SuperAdminRoute from './components/SuperAdminRoute';

function App() {
  return (
    <AuthProvider>
      <ConfigProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            {/* Super Admin Routes */}
            <Route element={<SuperAdminRoute />}>
              <Route path="/super-admin" element={<SuperAdminDashboard />}>
                <Route index element={<h2 className="text-xl">Welcome, Super Admin</h2>} />
                <Route path="features" element={<FeatureToggles />} />
                <Route path="modules" element={<ModuleRegistry />} />
                <Route path="layouts" element={<LayoutEditor />} />
                <Route path="builder" element={<Builder />} />
              </Route>
            </Route>

            {/* Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={['hospital_admin']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/doctors" element={<ManageDoctors />} />
              <Route path="/admin/doctors/:id" element={<DoctorProfile />} />
              <Route path="/admin/pharmacies/register" element={<PharmacyRegistration />} />
              <Route path="/admin/pharmacies" element={<ManagePharmacies />} />
              <Route path="/admin/pharmacists" element={<ManagePharmacists />} />
              <Route path="/admin/patients" element={<ManagePatients />} />
              <Route path="/admin/patient/:id" element={<PatientProfile />} />
            </Route>
            {/* Doctor Routes */}
            <Route element={<ProtectedRoute allowedRoles={['doctor']} />}>
              <Route path="/doctor" element={<DoctorDashboard />} />
              <Route path="/doctor/patients" element={<DoctorPatients />} />
              <Route path="/doctor/appointments" element={<DoctorAppointments />} />
              <Route path="/doctor/prescriptions" element={<PrescriptionList />} />
              <Route path="/doctor/prescriptions/:id" element={<PrescriptionDetail />} />
              <Route path="/print/prescriptions/:id" element={<PrescriptionPrint />} />
            </Route>
            {/* Patient Routes */}
            <Route element={<ProtectedRoute allowedRoles={['patient']} />}>
              <Route path="/patient" element={<PatientDashboard />} />
              <Route path="/patient/doctors" element={<DoctorDiscovery />} />
              <Route path="/patient/book-appointment" element={<BookAppointment />} />
              <Route path="/patient/prescriptions" element={<Prescriptions />} />
              <Route path="/patient/lab-reports" element={<LabReports />} />
              <Route path="/patient/invoices" element={<Billing />} />
              <Route path="/patient/chat" element={<Chat />} />
              <Route path="/patient/profile" element={<MyProfile />} />
            </Route>
            {/* Staff Routes */}
            <Route element={<ProtectedRoute allowedRoles={['hospital_staff', 'hospital_admin', 'super_admin']} />}>
              <Route path="/staff" element={<StaffDashboard />} />
              <Route path="/staff/register-patient" element={<PatientRegistration />} />
              <Route path="/staff/patients" element={<PatientList />} />
              <Route path="/staff/checkin" element={<PatientCheckIn />} />
              <Route path="/staff/health-cards" element={<DigitalHealthCards />} />
              <Route path="/staff/health-id" element={<HealthIdScanner />} />
            </Route>
            {/* Pharmacy Routes */}
            <Route element={<ProtectedRoute allowedRoles={['pharmacy']} />}>
              <Route path="/pharmacy" element={<PharmacyDashboard />} />
              <Route path="/pharmacy/prescriptions" element={<PrescriptionQueue />} />
              <Route path="/pharmacy/inventory" element={<MedicineInventory />} />
              <Route path="/pharmacy/alerts" element={<StockAlerts />} />
              <Route path="/pharmacy/pos" element={<POSInterface />} />
              <Route path="/pharmacy/gsr" element={<GsrInventorySuite />} />
            </Route>

            {/* Shared Routes */}
            <Route element={<ProtectedRoute allowedRoles={['doctor', 'patient']} />}>
              <Route path="/telemedicine" element={<TelemedicineRoom />} />
            </Route>

          </Routes>
        </Router>
      </ConfigProvider>
    </AuthProvider>
  );
}

export default App;
