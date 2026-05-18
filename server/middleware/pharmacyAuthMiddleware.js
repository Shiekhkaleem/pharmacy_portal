const PharmacyUser = require('../models/PharmacyUser');
const Pharmacy = require('../models/Pharmacy');

// Pharmacy role-based authorization middleware
exports.authorizePharmacyRole = (...roles) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ success: false, message: 'Not authenticated' });
            }

            // 1. Try to find existing association
            let pharmacyUser = await PharmacyUser.findOne({
                userId: req.user._id,
                isDeleted: false
            });

            // 2. Self-healing: If no active association exists, but user has global role, create/activate one
            const globalRolesEligible = ['pharmacy', 'hospital_admin', 'hospital_staff', 'pharmacist', 'super_admin'];

            if (!pharmacyUser || pharmacyUser.status !== 'active') {
                if (globalRolesEligible.includes(req.user.role)) {
                    console.log(`[PharmacyAuth] Auto-fixing association for ${req.user.email} (Global Role: ${req.user.role})`);

                    let pharmacy = await Pharmacy.findOne({ 'basicProfile.operationalStatus': 'Active' })
                        || await Pharmacy.findOne();

                    if (!pharmacy) {
                        console.log('[PharmacyAuth] No pharmacy found. Creating default "System Central Pharmacy"...');
                        try {
                            pharmacy = await Pharmacy.create({
                                basicProfile: {
                                    pharmacyName: 'System Central Pharmacy',
                                    pharmacyType: 'OPD Pharmacy',
                                    hospitalBranch: 'Main',
                                    pharmacyCode: 'PHA-CENTRAL-001',
                                    operationalStatus: 'Active'
                                },
                                licensing: {
                                    licenseNumber: 'LIC-CENTRAL-001',
                                    licenseExpiry: new Date(new Date().setFullYear(new Date().getFullYear() + 10))
                                },
                                assignedPharmacist: {
                                    chiefPharmacist: req.user._id,
                                    registrationNumber: 'REG-CENTRAL-001'
                                },
                                physicalLocation: {
                                    floor: 'Ground',
                                    wing: 'A'
                                },
                                approvalWorkflow: {
                                    registeredBy: req.user._id,
                                    approvalStatus: 'Approved'
                                }
                            });
                            console.log(`[PharmacyAuth] Created default pharmacy: ${pharmacy.basicProfile.pharmacyName}`);
                        } catch (createErr) {
                            console.error('[PharmacyAuth] CRITICAL: Failed to create default pharmacy:', createErr.message);
                        }
                    }

                    if (pharmacy) {
                        if (!pharmacyUser) {
                            // Create new
                            pharmacyUser = await PharmacyUser.create({
                                userId: req.user._id,
                                pharmacyId: pharmacy._id,
                                pharmacyRole: 'pharmacy_admin',
                                status: 'active',
                                permissions: ['all']
                            });
                        } else {
                            // Update existing (suspended or inactive)
                            pharmacyUser.status = 'active';
                            pharmacyUser.pharmacyRole = 'pharmacy_admin';
                            pharmacyUser.pharmacyId = pharmacy._id; // Ensure they follow the default pharmacy
                            await pharmacyUser.save();
                        }
                        console.log(`[PharmacyAuth] SUCCESS: Association auto-fixed for ${req.user.email}`);
                    }
                }
            }

            // 3. Final Check with Detailed Error Messages
            if (!pharmacyUser) {
                return res.status(403).json({
                    success: false,
                    message: 'Access Denied: No pharmacy association found for your account.',
                    reason: 'NO_ASSOCIATION',
                    userRole: req.user.role
                });
            }

            if (pharmacyUser.status !== 'active') {
                return res.status(403).json({
                    success: false,
                    message: `Access Denied: Your pharmacy account status is currently ${pharmacyUser.status}.`,
                    reason: 'INACTIVE_STATUS',
                    status: pharmacyUser.status
                });
            }

            const activeRoles = Array.from(new Set([pharmacyUser.pharmacyRole, ...(pharmacyUser.pharmacyRoles || [])].filter(Boolean)));

            console.log(`[PharmacyAuth] Authorized: ${req.user.email} | Pharmacy Roles: ${activeRoles.join(', ')} | Allowed: ${roles}`);

            // 4. Role Authorization
            // Admin role bypasses all checks
            if (activeRoles.includes('pharmacy_admin')) {
                req.pharmacyUser = pharmacyUser;
                req.pharmacyRole = pharmacyUser.pharmacyRole;
                req.pharmacyRoles = activeRoles;
                req.pharmacyId = pharmacyUser.pharmacyId;
                return next();
            }

            const hasAllowedRole = activeRoles.some(role => roles.includes(role));

            if (!hasAllowedRole) {
                console.warn(`[PharmacyAuth] Access denied. User roles ${activeRoles.join(', ')} not in ${roles}`);
                return res.status(403).json({
                    success: false,
                    message: `Access denied. Required role: ${roles.join(' or ')}`,
                    reason: 'ROLE_MISMATCH',
                    requiredRoles: roles,
                    yourRole: pharmacyUser.pharmacyRole,
                    yourRoles: activeRoles
                });
            }

            // Attach pharmacy info to request
            req.pharmacyUser = pharmacyUser;
            req.pharmacyRole = pharmacyUser.pharmacyRole;
            req.pharmacyRoles = activeRoles;
            req.pharmacyId = pharmacyUser.pharmacyId;

            next();
        } catch (error) {
            console.error('Authorization error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal Authorization Error',
                error: error.message
            });
        }
    };
};

// Check if user has specific permission
exports.checkPermission = (permission) => {
    return async (req, res, next) => {
        try {
            const pharmacyUser = await PharmacyUser.findOne({
                userId: req.user._id,
                status: 'active'
            });

            if (!pharmacyUser) {
                return res.status(403).json({
                    success: false,
                    message: 'No pharmacy association found'
                });
            }

            // Define role-based permissions
            const rolePermissions = {
                pharmacy_admin: ['all'],
                pharmacist: [
                    'view_inventory',
                    'manage_inventory',
                    'view_prescriptions',
                    'fulfill_prescriptions',
                    'view_transactions'
                ],
                cashier: [
                    'view_inventory',
                    'create_transaction',
                    'process_payment',
                    'manage_shift'
                ],
                inventory_manager: [
                    'view_inventory',
                    'manage_inventory',
                    'add_batch',
                    'adjust_stock',
                    'view_suppliers'
                ],
                auditor: [
                    'view_inventory',
                    'view_prescriptions',
                    'view_transactions',
                    'view_audit_logs',
                    'view_reports'
                ],
                cath_lab_admin: ['all'],
                cath_lab_store: [
                    'view_inventory',
                    'manage_inventory',
                    'issue_stock',
                    'receive_stock',
                    'view_reports'
                ],
                nursing_user: [
                    'view_inventory',
                    'record_consumption',
                    'return_stock'
                ],
                procedure_room_user: [
                    'view_inventory',
                    'record_consumption',
                    'return_stock'
                ],
                executive: [
                    'view_inventory',
                    'view_transactions',
                    'view_reports'
                ]
            };

            const activeRoles = Array.from(new Set([pharmacyUser.pharmacyRole, ...(pharmacyUser.pharmacyRoles || [])].filter(Boolean)));
            const userPermissions = Array.from(new Set(activeRoles.flatMap(role => rolePermissions[role] || [])));

            // Admin has all permissions
            if (userPermissions.includes('all')) {
                req.pharmacyUser = pharmacyUser;
                req.pharmacyRole = pharmacyUser.pharmacyRole;
                req.pharmacyRoles = activeRoles;
                req.pharmacyId = pharmacyUser.pharmacyId;
                return next();
            }

            // Check if user has the required permission
            if (!userPermissions.includes(permission)) {
                return res.status(403).json({
                    success: false,
                    message: `Permission denied. Required: ${permission}`
                });
            }

            req.pharmacyUser = pharmacyUser;
            req.pharmacyRole = pharmacyUser.pharmacyRole;
            req.pharmacyRoles = activeRoles;
            req.pharmacyId = pharmacyUser.pharmacyId;

            next();
        } catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({
                success: false,
                message: 'Permission check error',
                error: error.message
            });
        }
    };
};

// Attach pharmacy context to request
exports.attachPharmacyContext = async (req, res, next) => {
    try {
        if (!req.user) {
            return next();
        }

        const pharmacyUser = await PharmacyUser.findOne({
            userId: req.user._id,
            status: 'active',
            isDeleted: false
        }).populate('pharmacyId');

        if (pharmacyUser) {
            req.pharmacyUser = pharmacyUser;
            req.pharmacyRole = pharmacyUser.pharmacyRole;
            req.pharmacyRoles = Array.from(new Set([pharmacyUser.pharmacyRole, ...(pharmacyUser.pharmacyRoles || [])].filter(Boolean)));
            // Handle both populated and unpopulated states
            req.pharmacyId = pharmacyUser.pharmacyId._id || pharmacyUser.pharmacyId;
            req.pharmacy = pharmacyUser.pharmacyId._id ? pharmacyUser.pharmacyId : null;
        }

        next();
    } catch (error) {
        console.error('Attach pharmacy context error:', error);
        next();
    }
};
