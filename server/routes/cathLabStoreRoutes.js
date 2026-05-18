const express = require('express');
const router = express.Router();
const cathLabStoreController = require('../controllers/cathLabStoreController');
const { protect } = require('../middleware/authMiddleware');
const { authorizePharmacyRole, attachPharmacyContext } = require('../middleware/pharmacyAuthMiddleware');

router.use(protect);
router.use(attachPharmacyContext);

const canView = authorizePharmacyRole(
    'pharmacy_admin',
    'cath_lab_admin',
    'cath_lab_store',
    'nursing_user',
    'procedure_room_user',
    'inventory_manager',
    'auditor',
    'executive'
);

const canTransact = authorizePharmacyRole(
    'pharmacy_admin',
    'cath_lab_admin',
    'cath_lab_store',
    'nursing_user',
    'procedure_room_user',
    'inventory_manager'
);

router.get('/dashboard', canView, cathLabStoreController.getDashboard);
router.get('/patients', canView, cathLabStoreController.getCases);
router.get('/daily-suggestions', canView, cathLabStoreController.dailySuggestions);
router.get('/reports/generic', canView, cathLabStoreController.genericReport);

router.post('/patients', canTransact, cathLabStoreController.registerPatient);
router.post('/receive', canTransact, cathLabStoreController.receiveStock);
router.post('/issue', canTransact, cathLabStoreController.issueToProcedureRoom);
router.post('/consume', canTransact, cathLabStoreController.recordConsumption);
router.post('/return', canTransact, cathLabStoreController.returnItems);

module.exports = router;
