const express = require('express');
const router = express.Router();
const gsrLookupController = require('../controllers/gsrLookupController');
const { protect } = require('../middleware/authMiddleware');
const { authorizePharmacyRole, attachPharmacyContext } = require('../middleware/pharmacyAuthMiddleware');

router.use(protect);
router.use(attachPharmacyContext);

router.get('/',
    authorizePharmacyRole('pharmacy_admin', 'inventory_manager', 'auditor', 'cath_lab_admin', 'cath_lab_store', 'executive'),
    gsrLookupController.getLookups
);

router.post('/',
    authorizePharmacyRole('pharmacy_admin', 'inventory_manager', 'cath_lab_admin'),
    gsrLookupController.createLookup
);

router.put('/:id',
    authorizePharmacyRole('pharmacy_admin', 'inventory_manager', 'cath_lab_admin'),
    gsrLookupController.updateLookup
);

router.delete('/:id',
    authorizePharmacyRole('pharmacy_admin', 'inventory_manager', 'cath_lab_admin'),
    gsrLookupController.deleteLookup
);

module.exports = router;
