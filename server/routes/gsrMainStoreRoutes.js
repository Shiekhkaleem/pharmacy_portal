const express = require('express');
const router = express.Router();
const gsrMainStoreController = require('../controllers/gsrMainStoreController');
const { protect } = require('../middleware/authMiddleware');
const { authorizePharmacyRole, attachPharmacyContext } = require('../middleware/pharmacyAuthMiddleware');

router.use(protect);
router.use(attachPharmacyContext);

const canView = authorizePharmacyRole('pharmacy_admin', 'inventory_manager', 'pharmacist', 'auditor', 'executive');
const canTransact = authorizePharmacyRole('pharmacy_admin', 'inventory_manager', 'pharmacist');

router.get('/dashboard', canView, gsrMainStoreController.getDashboard);
router.get('/reports/generic', canView, gsrMainStoreController.genericReport);
router.post('/receive', canTransact, gsrMainStoreController.receiveStock);
router.post('/issue', canTransact, gsrMainStoreController.issueStock);
router.post('/stock-taking', canTransact, gsrMainStoreController.stockTaking);

module.exports = router;
