require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - Body:`, req.body);
  next();
});

// Database Connection
connectDB();

// Routes
console.log('--- RELOADING ROUTES ON PORT:', process.env.PORT || 5000, '---');
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/appointments', require('./routes/appointmentRoutes'));
app.use('/api/medicines', require('./routes/medicineRoutes'));
app.use('/api/prescriptions', require('./routes/prescriptionRoutes'));
app.use('/api/doctor', require('./routes/doctorRoutes'));
app.use('/api/patient', require('./routes/patientRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/staff/admissions', require('./routes/admissionRoutes')); // Specific route first
app.use('/api/staff/patients', require('./routes/staffPatientRoutes')); // Specific route second
app.use('/api/staff', require('./routes/staffRoutes'));
app.use('/api/lab-reports', require('./routes/labReportRoutes'));
app.use('/api/billing', require('./routes/billingRoutes'));
app.use('/api/check-in', require('./routes/checkInRoutes'));
app.use('/api/patients', require('./routes/universalPatientRoutes')); // Universal access for staff
app.use('/api/admin/patients', require('./routes/adminPatientRoutes')); // Admin Grid API
app.use('/api/pharmacies', require('./routes/pharmacyRoutes')); // Pharmacy management
app.use('/api/pharmacists', require('./routes/pharmacistRoutes')); // Pharmacist management

// Pharmacy Module Routes (New Enterprise System)
app.use('/api/pharmacy/auth', require('./routes/pharmacyAuthRoutes')); // Pharmacy authentication
app.use('/api/pharmacy/dashboard', require('./routes/pharmacyDashboardRoutes')); // Dashboard & KPIs
app.use('/api/pharmacy/inventory', require('./routes/pharmacyInventoryRoutes')); // Inventory management
app.use('/api/pharmacy/prescriptions', require('./routes/pharmacyPrescriptionRoutes')); // Prescription fulfillment
app.use('/api/pharmacy/pos', require('./routes/pharmacyPOSRoutes')); // Point of Sale

// AFIC GSR Medical Store and Cath Lab Store Modules
app.use('/api/gsr/lookups', require('./routes/gsrLookupRoutes')); // Admin-managed lookup values
app.use('/api/gsr/main-store', require('./routes/gsrMainStoreRoutes')); // Main medical store workflows
app.use('/api/gsr/cath-lab', require('./routes/cathLabStoreRoutes')); // Cath Lab store workflows

// Master Medicine Registry (Centralized Medicine Database)
app.use('/api/master-medicines', require('./routes/masterMedicineRoutes')); // Global medicine registry
app.use('/api/pharmacy/master-inventory', require('./routes/masterMedicineBatchRoutes')); // Pharmacy-specific inventory



app.get('/', (req, res) => {
  res.send('Telemedicine API is running...');
});

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ message: `Not Found - ${req.originalUrl}` });
});

// Error Handler
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

const net = require('net');

const findAvailablePort = (startPort) => {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(findAvailablePort(startPort + 1));
      } else {
        reject(err);
      }
    });
    server.listen(startPort, () => {
      server.close(() => {
        resolve(startPort);
      });
    });
  });
};

// Start Server with Socket.io
if (require.main === module) {
  const http = require('http');
  const { initializeSocket } = require('./socket');
  // Initializing server
  const server = http.createServer(app);
  initializeSocket(server);

  const startServer = async () => {
    try {
      const port = await findAvailablePort(PORT);
      server.listen(port, () => {
        console.log(`Server running on port ${port}`);
        console.log(`Socket.io enabled for real-time updates`);
        if (port !== PORT) {
          console.log(`Notice: Port ${PORT} was in use, switched to ${port}`);
        }
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  };

  startServer();
}

module.exports = app;
