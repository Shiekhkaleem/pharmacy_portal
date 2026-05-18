const MasterMedicine = require('../models/MasterMedicine');
const MasterMedicineBatch = require('../models/MasterMedicineBatch');
const PharmacyAuditLog = require('../models/PharmacyAuditLog');
const Supplier = require('../models/Supplier');
const mongoose = require('mongoose');

// @desc    Get pharmacy inventory with pagination
// @route   GET /api/pharmacy/master-inventory
// @access  Private (Pharmacy)
exports.getPharmacyInventory = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 5,
            search = '',
            status = '',
            lowStock = false,
            expiring = false,
            sortBy = 'expiryDate',
            sortOrder = 'asc'
        } = req.query;

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            search,
            status,
            lowStock: lowStock === 'true',
            expiring: expiring === 'true',
            sortBy,
            sortOrder
        };

        const result = await MasterMedicineBatch.getPharmacyInventory(req.pharmacyId, options);

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Get pharmacy inventory error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching pharmacy inventory',
            error: error.message
        });
    }
};

// @desc    Add new batch to pharmacy inventory
// @route   POST /api/pharmacy/master-inventory/batches
// @access  Private (Pharmacy)
exports.addBatch = async (req, res) => {
    try {
        const {
            masterMedicineId,
            batchNumber,
            quantity,
            purchasePrice,
            mrp,
            sellingPrice,
            discountPercentage,
            taxRate,
            supplierId,
            purchaseOrderId,
            supplierInvoiceNumber,
            manufacturingDate,
            expiryDate,
            barcode,
            qrCode,
            reorderLevel,
            isControlledDrug,
            requiresPrescription,
            storageLocation,
            storageConditions,
            notes
        } = req.body;

        // Verify master medicine exists
        const masterMedicine = await MasterMedicine.findById(masterMedicineId);
        if (!masterMedicine) {
            return res.status(404).json({
                success: false,
                message: 'Master medicine not found'
            });
        }

        // Verify supplier exists
        if (supplierId) {
            const supplier = await Supplier.findById(supplierId);
            if (!supplier) {
                return res.status(404).json({
                    success: false,
                    message: 'Supplier not found'
                });
            }
        }

        // Validate dates
        if (new Date(expiryDate) <= new Date(manufacturingDate)) {
            return res.status(400).json({
                success: false,
                message: 'Expiry date must be after manufacturing date'
            });
        }

        // Create batch
        const batch = await MasterMedicineBatch.create({
            masterMedicineId,
            pharmacyId: req.pharmacyId,
            batchNumber,
            quantity,
            purchasePrice,
            mrp,
            sellingPrice,
            discountPercentage,
            taxRate,
            supplierId,
            purchaseOrderId,
            supplierInvoiceNumber,
            manufacturingDate,
            expiryDate,
            barcode,
            qrCode,
            reorderLevel: reorderLevel || 10,
            isControlledDrug: isControlledDrug || masterMedicine.isControlledSubstance,
            requiresPrescription: requiresPrescription || masterMedicine.prescriptionRequired,
            storageLocation,
            storageConditions,
            notes,
            createdBy: req.user._id
        });

        // Populate master medicine details
        await batch.populate('masterMedicineId', 'name genericName manufacturer category strength dosageForm');

        // Create audit log
        await PharmacyAuditLog.createLog({
            pharmacyId: req.pharmacyId,
            userId: req.user._id,
            userName: req.user.name,
            action: 'create',
            entity: 'master_medicine_batch',
            entityId: batch._id,
            description: `Added new batch ${batchNumber} for ${masterMedicine.name}`,
            metadata: {
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
            }
        });

        res.status(201).json({
            success: true,
            message: 'Batch added successfully',
            data: batch
        });
    } catch (error) {
        console.error('Add batch error:', error);

        // Handle duplicate key errors
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({
                success: false,
                message: `Batch with this ${field} already exists`
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error adding batch',
            error: error.message
        });
    }
};

// @desc    Update batch
// @route   PUT /api/pharmacy/master-inventory/batches/:id
// @access  Private (Pharmacy)
exports.updateBatch = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        // Find batch
        const batch = await MasterMedicineBatch.findOne({
            _id: id,
            pharmacyId: req.pharmacyId,
            isDeleted: false
        });

        if (!batch) {
            return res.status(404).json({
                success: false,
                message: 'Batch not found'
            });
        }

        // Store old data for audit
        const oldData = batch.toObject();

        // Update fields
        updateData.updatedBy = req.user._id;
        delete updateData.pharmacyId; // Prevent pharmacy change
        delete updateData.masterMedicineId; // Prevent medicine change

        // Update batch
        Object.assign(batch, updateData);
        await batch.save();

        // Populate details
        await batch.populate('masterMedicineId', 'name genericName manufacturer');

        // Create audit log
        await PharmacyAuditLog.createLog({
            pharmacyId: req.pharmacyId,
            userId: req.user._id,
            userName: req.user.name,
            action: 'update',
            entity: 'master_medicine_batch',
            entityId: id,
            changes: {
                before: oldData,
                after: batch.toObject()
            },
            description: `Updated batch ${batch.batchNumber}`,
            metadata: {
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
            }
        });

        res.json({
            success: true,
            message: 'Batch updated successfully',
            data: batch
        });
    } catch (error) {
        console.error('Update batch error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating batch',
            error: error.message
        });
    }
};

// @desc    Adjust stock
// @route   PUT /api/pharmacy/master-inventory/batches/:id/adjust
// @access  Private (Pharmacy)
exports.adjustStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { adjustment, reason } = req.body;

        if (!adjustment || adjustment === 0) {
            return res.status(400).json({
                success: false,
                message: 'Adjustment value is required and cannot be zero'
            });
        }

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Reason for adjustment is required'
            });
        }

        const batch = await MasterMedicineBatch.findOne({
            _id: id,
            pharmacyId: req.pharmacyId,
            isDeleted: false
        });

        if (!batch) {
            return res.status(404).json({
                success: false,
                message: 'Batch not found'
            });
        }

        const oldQuantity = batch.quantity;

        // Adjust stock
        if (adjustment > 0) {
            await batch.addStock(adjustment);
        } else {
            await batch.deductStock(Math.abs(adjustment));
        }

        // Populate details
        await batch.populate('masterMedicineId', 'name genericName');

        // Create audit log
        await PharmacyAuditLog.createLog({
            pharmacyId: req.pharmacyId,
            userId: req.user._id,
            userName: req.user.name,
            action: 'adjust_stock',
            entity: 'master_medicine_batch',
            entityId: id,
            changes: {
                before: { quantity: oldQuantity },
                after: { quantity: batch.quantity }
            },
            description: `Stock adjusted for batch ${batch.batchNumber}: ${oldQuantity} → ${batch.quantity}. Reason: ${reason}`,
            metadata: {
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
            }
        });

        res.json({
            success: true,
            message: 'Stock adjusted successfully',
            data: batch
        });
    } catch (error) {
        console.error('Adjust stock error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error adjusting stock'
        });
    }
};

// @desc    Get inventory statistics
// @route   GET /api/pharmacy/master-inventory/stats
// @access  Private (Pharmacy)
exports.getInventoryStats = async (req, res) => {
    try {
        const pharmacyId = req.pharmacyId;

        const [
            totalBatches,
            lowStockBatches,
            expiringBatches,
            expiredBatches,
            totalValueResult,
            uniqueMedicines
        ] = await Promise.all([
            MasterMedicineBatch.countDocuments({ pharmacyId, isDeleted: false }),
            MasterMedicineBatch.countDocuments({
                pharmacyId,
                isDeleted: false,
                status: 'low_stock'
            }),
            MasterMedicineBatch.countDocuments({
                pharmacyId,
                isDeleted: false,
                expiryDate: {
                    $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    $gt: new Date()
                }
            }),
            MasterMedicineBatch.countDocuments({
                pharmacyId,
                isDeleted: false,
                status: 'expired'
            }),
            MasterMedicineBatch.aggregate([
                { $match: { pharmacyId: new mongoose.Types.ObjectId(String(pharmacyId)), isDeleted: false } },
                {
                    $group: {
                        _id: null,
                        totalValue: {
                            $sum: { $multiply: ['$quantity', { $ifNull: ['$sellingPrice', '$mrp'] }] }
                        }
                    }
                }
            ]),
            MasterMedicineBatch.distinct('masterMedicineId', { pharmacyId, isDeleted: false })
        ]);

        const totalValue = totalValueResult.length > 0 ? totalValueResult[0].totalValue : 0;

        res.json({
            success: true,
            data: {
                totalMedicines: uniqueMedicines.length,
                totalBatches,
                lowStockCount: lowStockBatches,
                expiringCount: expiringBatches,
                expiredCount: expiredBatches,
                totalValue: Math.round(totalValue * 100) / 100
            }
        });
    } catch (error) {
        console.error('Get inventory stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching inventory statistics',
            error: error.message
        });
    }
};

// @desc    Get expiring batches
// @route   GET /api/pharmacy/master-inventory/expiring
// @access  Private (Pharmacy)
exports.getExpiringBatches = async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const pharmacyId = req.pharmacyId;

        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + parseInt(days));

        const batches = await MasterMedicineBatch.find({
            pharmacyId,
            isDeleted: false,
            expiryDate: {
                $lte: targetDate,
                $gt: new Date()
            },
            status: { $ne: 'expired' }
        })
            .populate('masterMedicineId', 'name genericName manufacturer category strength dosageForm')
            .populate('supplierId', 'supplierName')
            .sort({ expiryDate: 1 });

        res.json({
            success: true,
            count: batches.length,
            data: batches
        });
    } catch (error) {
        console.error('Get expiring batches error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching expiring batches',
            error: error.message
        });
    }
};

// @desc    Get low stock batches
// @route   GET /api/pharmacy/master-inventory/low-stock
// @access  Private (Pharmacy)
exports.getLowStockBatches = async (req, res) => {
    try {
        const pharmacyId = req.pharmacyId;

        const batches = await MasterMedicineBatch.find({
            pharmacyId,
            isDeleted: false,
            status: { $in: ['available', 'low_stock'] }
        })
            .populate('masterMedicineId', 'name genericName manufacturer category strength dosageForm')
            .sort({ quantity: 1 });

        // Filter for low stock using virtual
        const lowStockBatches = batches.filter(batch => batch.isLowStock);

        res.json({
            success: true,
            count: lowStockBatches.length,
            data: lowStockBatches
        });
    } catch (error) {
        console.error('Get low stock batches error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching low stock batches',
            error: error.message
        });
    }
};

// @desc    Search by barcode
// @route   GET /api/pharmacy/master-inventory/barcode/:barcode
// @access  Private (Pharmacy)
exports.searchByBarcode = async (req, res) => {
    try {
        const { barcode } = req.params;
        const pharmacyId = req.pharmacyId;

        const batch = await MasterMedicineBatch.findOne({
            barcode,
            pharmacyId,
            isDeleted: false
        }).populate('masterMedicineId', 'name genericName manufacturer category strength dosageForm price');

        if (!batch) {
            return res.status(404).json({
                success: false,
                message: 'Batch not found with this barcode'
            });
        }

        res.json({
            success: true,
            data: batch
        });
    } catch (error) {
        console.error('Barcode search error:', error);
        res.status(500).json({
            success: false,
            message: 'Error searching by barcode',
            error: error.message
        });
    }
};

// @desc    Recall batch
// @route   PUT /api/pharmacy/master-inventory/batches/:id/recall
// @access  Private (Pharmacy Admin)
exports.recallBatch = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Recall reason is required'
            });
        }

        const batch = await MasterMedicineBatch.findOne({
            _id: id,
            pharmacyId: req.pharmacyId,
            isDeleted: false
        });

        if (!batch) {
            return res.status(404).json({
                success: false,
                message: 'Batch not found'
            });
        }

        await batch.recall(reason, req.user._id);
        await batch.populate('masterMedicineId', 'name genericName');

        // Create audit log
        await PharmacyAuditLog.createLog({
            pharmacyId: req.pharmacyId,
            userId: req.user._id,
            userName: req.user.name,
            action: 'recall',
            entity: 'master_medicine_batch',
            entityId: id,
            description: `Recalled batch ${batch.batchNumber}. Reason: ${reason}`,
            metadata: {
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
            }
        });

        res.json({
            success: true,
            message: 'Batch recalled successfully',
            data: batch
        });
    } catch (error) {
        console.error('Recall batch error:', error);
        res.status(500).json({
            success: false,
            message: 'Error recalling batch',
            error: error.message
        });
    }
};

// @desc    Delete batch (soft delete)
// @route   DELETE /api/pharmacy/master-inventory/batches/:id
// @access  Private (Pharmacy Admin)
exports.deleteBatch = async (req, res) => {
    try {
        const { id } = req.params;

        const batch = await MasterMedicineBatch.findOne({
            _id: id,
            pharmacyId: req.pharmacyId,
            isDeleted: false
        });

        if (!batch) {
            return res.status(404).json({
                success: false,
                message: 'Batch not found'
            });
        }

        await batch.softDelete(req.user._id);

        // Create audit log
        await PharmacyAuditLog.createLog({
            pharmacyId: req.pharmacyId,
            userId: req.user._id,
            userName: req.user.name,
            action: 'delete',
            entity: 'master_medicine_batch',
            entityId: id,
            description: `Deleted batch ${batch.batchNumber}`,
            metadata: {
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
            }
        });

        res.json({
            success: true,
            message: 'Batch deleted successfully'
        });
    } catch (error) {
        console.error('Delete batch error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting batch',
            error: error.message
        });
    }
};
