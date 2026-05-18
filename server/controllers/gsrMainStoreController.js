const mongoose = require('mongoose');
const MasterMedicineBatch = require('../models/MasterMedicineBatch');
const MedicalStoreTransaction = require('../models/MedicalStoreTransaction');
const {
    toPositiveNumber,
    findBatchByScan,
    findMedicineIdsForSearch,
    buildTransactionMedicineFields,
    createAuditLog,
    groupRowsForAxis
} = require('../utils/gsrStoreUtils');

const transactionPopulate = [
    { path: 'masterMedicineId', select: 'name genericName manufacturer category strength dosageForm unitPrice barcode' },
    { path: 'batchId', select: 'batchNumber quantity expiryDate status barcode' },
    { path: 'performedBy', select: 'name email role' }
];

const getPharmacyObjectId = (pharmacyId) => new mongoose.Types.ObjectId(String(pharmacyId));

exports.getDashboard = async (req, res) => {
    try {
        const pharmacyObjectId = getPharmacyObjectId(req.pharmacyId);
        const now = new Date();
        const next30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const last90Days = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

        const [
            totalBatches,
            stockTotals,
            lowStockCount,
            expiringCount,
            departmentIssues,
            topConsumption,
            recentTransactions
        ] = await Promise.all([
            MasterMedicineBatch.countDocuments({ pharmacyId: req.pharmacyId, isDeleted: false }),
            MasterMedicineBatch.aggregate([
                { $match: { pharmacyId: pharmacyObjectId, isDeleted: false } },
                {
                    $group: {
                        _id: null,
                        totalStock: { $sum: '$quantity' },
                        approximateBudget: {
                            $sum: { $multiply: ['$quantity', { $ifNull: ['$purchasePrice', { $ifNull: ['$mrp', 0] }] }] }
                        }
                    }
                }
            ]),
            MasterMedicineBatch.countDocuments({
                pharmacyId: req.pharmacyId,
                isDeleted: false,
                status: 'low_stock'
            }),
            MasterMedicineBatch.countDocuments({
                pharmacyId: req.pharmacyId,
                isDeleted: false,
                expiryDate: { $lte: next30Days, $gt: now }
            }),
            MedicalStoreTransaction.aggregate([
                {
                    $match: {
                        pharmacyId: pharmacyObjectId,
                        transactionType: 'issue',
                        createdAt: { $gte: last90Days }
                    }
                },
                { $group: { _id: '$department', quantity: { $sum: '$quantity' }, totalCost: { $sum: '$totalCost' } } },
                { $sort: { quantity: -1 } },
                { $limit: 10 }
            ]),
            MedicalStoreTransaction.aggregate([
                {
                    $match: {
                        pharmacyId: pharmacyObjectId,
                        transactionType: 'issue',
                        createdAt: { $gte: last90Days },
                        masterMedicineId: { $ne: null }
                    }
                },
                { $group: { _id: '$masterMedicineId', quantity: { $sum: '$quantity' }, totalCost: { $sum: '$totalCost' } } },
                { $sort: { quantity: -1 } },
                { $limit: 10 },
                {
                    $lookup: {
                        from: 'mastermedicines',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'medicine'
                    }
                },
                { $unwind: { path: '$medicine', preserveNullAndEmptyArrays: true } }
            ]),
            MedicalStoreTransaction.find({ pharmacyId: req.pharmacyId })
                .populate(transactionPopulate)
                .sort({ createdAt: -1 })
                .limit(10)
                .lean()
        ]);

        const totalStock = stockTotals[0]?.totalStock || 0;
        const approximateBudget = stockTotals[0]?.approximateBudget || 0;
        const issuedLast90Days = topConsumption.reduce((sum, item) => sum + item.quantity, 0);
        const forecastNext30Days = Math.ceil(issuedLast90Days / 3);

        res.json({
            success: true,
            data: {
                totalBatches,
                totalStock,
                lowStockCount,
                expiringCount,
                approximateBudget,
                forecastNext30Days,
                departmentIssues: departmentIssues.map(item => ({
                    department: item._id || 'Unassigned department',
                    quantity: item.quantity,
                    totalCost: item.totalCost
                })),
                topConsumption: topConsumption.map(item => ({
                    medicineId: item._id,
                    medicineName: item.medicine?.name || 'Unknown item',
                    quantity: item.quantity,
                    totalCost: item.totalCost
                })),
                recentTransactions
            }
        });
    } catch (error) {
        console.error('Main store dashboard error:', error);
        res.status(500).json({ success: false, message: 'Error fetching main store dashboard', error: error.message });
    }
};

exports.receiveStock = async (req, res) => {
    try {
        const quantity = toPositiveNumber(req.body.quantity);
        if (!quantity) {
            return res.status(400).json({ success: false, message: 'Quantity must be greater than zero' });
        }

        const batch = await findBatchByScan({
            pharmacyId: req.pharmacyId,
            batchId: req.body.batchId,
            scanCode: req.body.scanCode || req.body.barcode || req.body.batchNumber
        });

        if (!batch) {
            return res.status(404).json({
                success: false,
                message: 'Existing batch was not found. Add the batch in medicine inventory first, then receive against it.'
            });
        }

        const previousQuantity = batch.quantity;
        await batch.addStock(quantity);

        const medicineFields = buildTransactionMedicineFields(batch);
        const transaction = await MedicalStoreTransaction.create({
            pharmacyId: req.pharmacyId,
            transactionType: 'receipt',
            ...medicineFields,
            scanCode: req.body.scanCode || req.body.barcode || batch.barcode || batch.batchNumber,
            quantity,
            previousQuantity,
            unitPrice: medicineFields.unitPrice,
            totalCost: quantity * medicineFields.unitPrice,
            source: req.body.source,
            fromLocation: req.body.fromLocation,
            toLocation: req.body.toLocation,
            itemMetadata: req.body.itemMetadata,
            notes: req.body.notes,
            performedBy: req.user._id
        });

        await createAuditLog({
            req,
            action: 'receive',
            entity: 'medical_store_transaction',
            entityId: transaction._id,
            changes: { before: { quantity: previousQuantity }, after: { quantity: batch.quantity } },
            description: `Received ${quantity} item(s) into main medical store for batch ${batch.batchNumber}`
        });

        res.status(201).json({ success: true, message: 'Stock received successfully', data: transaction });
    } catch (error) {
        console.error('Receive stock error:', error);
        res.status(500).json({ success: false, message: 'Error receiving stock', error: error.message });
    }
};

exports.issueStock = async (req, res) => {
    try {
        const quantity = toPositiveNumber(req.body.quantity);
        if (!quantity) {
            return res.status(400).json({ success: false, message: 'Quantity must be greater than zero' });
        }

        const batch = await findBatchByScan({
            pharmacyId: req.pharmacyId,
            batchId: req.body.batchId,
            scanCode: req.body.scanCode || req.body.barcode || req.body.batchNumber
        });

        if (!batch) {
            return res.status(404).json({ success: false, message: 'Batch not found for issue' });
        }

        const previousQuantity = batch.quantity;
        await batch.deductStock(quantity);

        const medicineFields = buildTransactionMedicineFields(batch);
        const transaction = await MedicalStoreTransaction.create({
            pharmacyId: req.pharmacyId,
            transactionType: 'issue',
            ...medicineFields,
            scanCode: req.body.scanCode || req.body.barcode || batch.barcode || batch.batchNumber,
            quantity,
            previousQuantity,
            unitPrice: medicineFields.unitPrice,
            totalCost: quantity * medicineFields.unitPrice,
            department: req.body.department,
            fromLocation: req.body.fromLocation,
            toLocation: req.body.toLocation,
            receiverName: req.body.receiverName,
            issuedToRole: req.body.issuedToRole,
            reason: req.body.reason,
            notes: req.body.notes,
            performedBy: req.user._id
        });

        await createAuditLog({
            req,
            action: 'issue',
            entity: 'medical_store_transaction',
            entityId: transaction._id,
            changes: { before: { quantity: previousQuantity }, after: { quantity: batch.quantity } },
            description: `Issued ${quantity} item(s) from main medical store to ${req.body.department || 'department'} for batch ${batch.batchNumber}`
        });

        res.status(201).json({ success: true, message: 'Stock issued successfully', data: transaction });
    } catch (error) {
        console.error('Issue stock error:', error);
        res.status(500).json({ success: false, message: error.message || 'Error issuing stock' });
    }
};

exports.stockTaking = async (req, res) => {
    try {
        const countedQuantity = toPositiveNumber(req.body.countedQuantity);
        const batch = await findBatchByScan({
            pharmacyId: req.pharmacyId,
            batchId: req.body.batchId,
            scanCode: req.body.scanCode || req.body.barcode || req.body.batchNumber
        });

        if (!batch) {
            return res.status(404).json({ success: false, message: 'Batch not found for stock taking' });
        }

        const previousQuantity = batch.quantity;
        batch.quantity = countedQuantity;
        batch.updatedBy = req.user._id;
        await batch.save();

        const medicineFields = buildTransactionMedicineFields(batch);
        const transaction = await MedicalStoreTransaction.create({
            pharmacyId: req.pharmacyId,
            transactionType: 'stock_taking',
            ...medicineFields,
            scanCode: req.body.scanCode || req.body.barcode || batch.barcode || batch.batchNumber,
            quantity: countedQuantity - previousQuantity,
            previousQuantity,
            countedQuantity,
            unitPrice: medicineFields.unitPrice,
            totalCost: Math.abs(countedQuantity - previousQuantity) * medicineFields.unitPrice,
            fromLocation: req.body.location,
            toLocation: req.body.location,
            reason: req.body.reason,
            notes: req.body.notes,
            performedBy: req.user._id
        });

        await createAuditLog({
            req,
            action: 'stock_take',
            entity: 'medical_store_transaction',
            entityId: transaction._id,
            changes: { before: { quantity: previousQuantity }, after: { quantity: batch.quantity } },
            description: `Stock taking adjusted batch ${batch.batchNumber}: ${previousQuantity} to ${batch.quantity}`
        });

        res.status(201).json({ success: true, message: 'Stock taking recorded', data: transaction });
    } catch (error) {
        console.error('Stock taking error:', error);
        res.status(500).json({ success: false, message: 'Error recording stock taking', error: error.message });
    }
};

exports.genericReport = async (req, res) => {
    try {
        const {
            q = '',
            transactionType,
            xAxis = 'transactionType',
            fromDate,
            toDate,
            limit = 500
        } = req.query;

        const query = { pharmacyId: req.pharmacyId };

        if (transactionType) {
            query.transactionType = transactionType;
        }

        if (fromDate || toDate) {
            query.createdAt = {};
            if (fromDate) query.createdAt.$gte = new Date(fromDate);
            if (toDate) query.createdAt.$lte = new Date(toDate);
        }

        if (q) {
            const medicineIds = await findMedicineIdsForSearch(q);
            query.$or = [
                { masterMedicineId: { $in: medicineIds } },
                { batchNumber: { $regex: q, $options: 'i' } },
                { barcode: { $regex: q, $options: 'i' } },
                { scanCode: { $regex: q, $options: 'i' } },
                { department: { $regex: q, $options: 'i' } },
                { source: { $regex: q, $options: 'i' } },
                { receiverName: { $regex: q, $options: 'i' } },
                { notes: { $regex: q, $options: 'i' } }
            ];
        }

        const rows = await MedicalStoreTransaction.find(query)
            .populate(transactionPopulate)
            .sort({ createdAt: -1 })
            .limit(Math.min(parseInt(limit), 1000))
            .lean();

        const graphData = groupRowsForAxis(rows, xAxis);

        const reportTransaction = await MedicalStoreTransaction.create({
            pharmacyId: req.pharmacyId,
            transactionType: 'report_generation',
            quantity: 0,
            report: {
                name: 'Main Store Generic Report',
                xAxis,
                filters: req.query
            },
            performedBy: req.user._id
        });

        await createAuditLog({
            req,
            action: 'generate_report',
            entity: 'medical_store_transaction',
            entityId: reportTransaction._id,
            description: `Generated main store generic report with x-axis ${xAxis}`
        });

        res.json({
            success: true,
            count: rows.length,
            xAxis,
            data: rows,
            graphData
        });
    } catch (error) {
        console.error('Main store generic report error:', error);
        res.status(500).json({ success: false, message: 'Error generating report', error: error.message });
    }
};
