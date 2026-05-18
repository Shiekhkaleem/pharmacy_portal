const mongoose = require('mongoose');
const MasterMedicineBatch = require('../models/MasterMedicineBatch');
const CathLabCase = require('../models/CathLabCase');
const CathLabStockTransaction = require('../models/CathLabStockTransaction');
const {
    toPositiveNumber,
    findBatchByScan,
    findMedicineIdsForSearch,
    buildTransactionMedicineFields,
    createAuditLog,
    groupRowsForAxis
} = require('../utils/gsrStoreUtils');

const transactionPopulate = [
    { path: 'caseId', select: 'caseNumber patientName patientIdentifier patientType procedureName doctorName wristbandBarcode status' },
    { path: 'masterMedicineId', select: 'name genericName manufacturer category strength dosageForm unitPrice barcode' },
    { path: 'batchId', select: 'batchNumber quantity expiryDate status barcode' },
    { path: 'performedBy', select: 'name email role' }
];

const getPharmacyObjectId = (pharmacyId) => new mongoose.Types.ObjectId(String(pharmacyId));

exports.getDashboard = async (req, res) => {
    try {
        const pharmacyObjectId = getPharmacyObjectId(req.pharmacyId);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [
            activeCases,
            registeredToday,
            lowStockCount,
            expenseOverall,
            itemConsumption,
            doctorConsumption,
            procedureConsumption,
            patientCategoryStats,
            recentTransactions
        ] = await Promise.all([
            CathLabCase.countDocuments({ pharmacyId: req.pharmacyId, status: { $in: ['registered', 'in_procedure'] } }),
            CathLabCase.countDocuments({ pharmacyId: req.pharmacyId, createdAt: { $gte: today, $lt: tomorrow } }),
            MasterMedicineBatch.countDocuments({ pharmacyId: req.pharmacyId, isDeleted: false, status: 'low_stock' }),
            CathLabStockTransaction.aggregate([
                { $match: { pharmacyId: pharmacyObjectId, transactionType: 'consumption' } },
                { $group: { _id: null, totalCost: { $sum: '$totalCost' }, quantity: { $sum: '$quantity' } } }
            ]),
            CathLabStockTransaction.aggregate([
                { $match: { pharmacyId: pharmacyObjectId, transactionType: 'consumption', masterMedicineId: { $ne: null } } },
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
            CathLabStockTransaction.aggregate([
                { $match: { pharmacyId: pharmacyObjectId, transactionType: 'consumption' } },
                { $group: { _id: '$doctorName', quantity: { $sum: '$quantity' }, totalCost: { $sum: '$totalCost' } } },
                { $sort: { totalCost: -1 } },
                { $limit: 10 }
            ]),
            CathLabStockTransaction.aggregate([
                { $match: { pharmacyId: pharmacyObjectId, transactionType: 'consumption' } },
                { $group: { _id: '$procedureName', quantity: { $sum: '$quantity' }, totalCost: { $sum: '$totalCost' } } },
                { $sort: { totalCost: -1 } },
                { $limit: 10 }
            ]),
            CathLabCase.aggregate([
                { $match: { pharmacyId: pharmacyObjectId } },
                { $group: { _id: '$patientType', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            CathLabStockTransaction.find({ pharmacyId: req.pharmacyId })
                .populate(transactionPopulate)
                .sort({ createdAt: -1 })
                .limit(10)
                .lean()
        ]);

        res.json({
            success: true,
            data: {
                activeCases,
                registeredToday,
                lowStockCount,
                totalExpense: expenseOverall[0]?.totalCost || 0,
                consumedQuantity: expenseOverall[0]?.quantity || 0,
                itemConsumption: itemConsumption.map(item => ({
                    medicineId: item._id,
                    medicineName: item.medicine?.name || 'Unknown item',
                    quantity: item.quantity,
                    totalCost: item.totalCost
                })),
                doctorConsumption: doctorConsumption.map(item => ({
                    doctorName: item._id || 'Unassigned doctor',
                    quantity: item.quantity,
                    totalCost: item.totalCost
                })),
                procedureConsumption: procedureConsumption.map(item => ({
                    procedureName: item._id || 'Unassigned procedure',
                    quantity: item.quantity,
                    totalCost: item.totalCost
                })),
                patientCategoryStats: patientCategoryStats.map(item => ({
                    patientType: item._id || 'Unassigned patient type',
                    count: item.count
                })),
                recentTransactions
            }
        });
    } catch (error) {
        console.error('Cath Lab dashboard error:', error);
        res.status(500).json({ success: false, message: 'Error fetching Cath Lab dashboard', error: error.message });
    }
};

exports.registerPatient = async (req, res) => {
    try {
        const cathCase = await CathLabCase.create({
            pharmacyId: req.pharmacyId,
            patientName: req.body.patientName,
            patientIdentifier: req.body.patientIdentifier,
            patientType: req.body.patientType,
            procedureName: req.body.procedureName,
            doctorName: req.body.doctorName,
            basicInfo: req.body.basicInfo || {},
            registeredBy: req.user._id
        });

        await createAuditLog({
            req,
            action: 'create',
            entity: 'cath_lab_case',
            entityId: cathCase._id,
            description: `Registered Cath Lab patient ${cathCase.patientName} for ${cathCase.procedureName}`
        });

        res.status(201).json({ success: true, message: 'Cath Lab patient registered', data: cathCase });
    } catch (error) {
        console.error('Cath Lab patient registration error:', error);
        res.status(500).json({ success: false, message: 'Error registering patient', error: error.message });
    }
};

exports.getCases = async (req, res) => {
    try {
        const { q = '', status, limit = 50 } = req.query;
        const query = { pharmacyId: req.pharmacyId };

        if (status) query.status = status;
        if (q) {
            query.$or = [
                { patientName: { $regex: q, $options: 'i' } },
                { patientIdentifier: { $regex: q, $options: 'i' } },
                { caseNumber: { $regex: q, $options: 'i' } },
                { wristbandBarcode: { $regex: q, $options: 'i' } },
                { procedureName: { $regex: q, $options: 'i' } },
                { doctorName: { $regex: q, $options: 'i' } }
            ];
        }

        const cases = await CathLabCase.find(query)
            .sort({ createdAt: -1 })
            .limit(Math.min(parseInt(limit), 200))
            .lean();

        res.json({ success: true, count: cases.length, data: cases });
    } catch (error) {
        console.error('Get Cath Lab cases error:', error);
        res.status(500).json({ success: false, message: 'Error fetching cases', error: error.message });
    }
};

const createStockTransaction = async ({ req, transactionType, batch, quantity, extra = {}, action, description }) => {
    const medicineFields = buildTransactionMedicineFields(batch);
    const unitCost = medicineFields.unitPrice;

    const transaction = await CathLabStockTransaction.create({
        pharmacyId: req.pharmacyId,
        transactionType,
        ...medicineFields,
        scanCode: req.body.scanCode || req.body.barcode || batch?.barcode || batch?.batchNumber,
        quantity,
        unitCost,
        totalCost: quantity * unitCost,
        performedBy: req.user._id,
        ...extra
    });

    await createAuditLog({
        req,
        action,
        entity: 'cath_lab_stock_transaction',
        entityId: transaction._id,
        description
    });

    return transaction;
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
            return res.status(404).json({ success: false, message: 'Batch not found for Cath Lab receipt' });
        }

        const previousQuantity = batch.quantity;
        await batch.addStock(quantity);

        const transaction = await createStockTransaction({
            req,
            transactionType: 'receipt',
            batch,
            quantity,
            extra: {
                source: req.body.source,
                subStore: req.body.subStore,
                procedureRoom: req.body.procedureRoom,
                notes: req.body.notes
            },
            action: 'receive',
            description: `Received ${quantity} item(s) into Cath Lab store for batch ${batch.batchNumber}`
        });

        transaction._doc.previousQuantity = previousQuantity;
        res.status(201).json({ success: true, message: 'Cath Lab stock received', data: transaction });
    } catch (error) {
        console.error('Cath Lab receive stock error:', error);
        res.status(500).json({ success: false, message: 'Error receiving Cath Lab stock', error: error.message });
    }
};

exports.issueToProcedureRoom = async (req, res) => {
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
            return res.status(404).json({ success: false, message: 'Batch not found for procedure-room issue' });
        }

        await batch.deductStock(quantity);

        const transaction = await createStockTransaction({
            req,
            transactionType: 'issue_to_procedure_room',
            batch,
            quantity,
            extra: {
                source: req.body.source,
                subStore: req.body.subStore,
                procedureRoom: req.body.procedureRoom,
                nurseName: req.body.nurseName,
                nursingAccount: req.body.nursingAccount || req.body.nurseName,
                notes: req.body.notes
            },
            action: 'issue',
            description: `Issued ${quantity} item(s) to ${req.body.procedureRoom || 'procedure room'} under ${req.body.nurseName || 'nursing account'}`
        });

        res.status(201).json({ success: true, message: 'Stock issued to procedure room', data: transaction });
    } catch (error) {
        console.error('Cath Lab issue error:', error);
        res.status(500).json({ success: false, message: error.message || 'Error issuing stock to procedure room' });
    }
};

exports.recordConsumption = async (req, res) => {
    try {
        const quantity = toPositiveNumber(req.body.quantity);
        if (!quantity) {
            return res.status(400).json({ success: false, message: 'Quantity must be greater than zero' });
        }

        const cathCase = await CathLabCase.findOne({ _id: req.body.caseId, pharmacyId: req.pharmacyId });
        if (!cathCase) {
            return res.status(404).json({ success: false, message: 'Cath Lab case not found' });
        }

        const batch = await findBatchByScan({
            pharmacyId: req.pharmacyId,
            batchId: req.body.batchId,
            scanCode: req.body.scanCode || req.body.barcode || req.body.batchNumber
        });

        if (!batch) {
            return res.status(404).json({ success: false, message: 'Batch not found for consumption' });
        }

        if (req.body.deductFromStock === true) {
            await batch.deductStock(quantity);
        }

        if (cathCase.status === 'registered') {
            cathCase.status = 'in_procedure';
            await cathCase.save();
        }

        const transaction = await createStockTransaction({
            req,
            transactionType: 'consumption',
            batch,
            quantity,
            extra: {
                caseId: cathCase._id,
                subStore: req.body.subStore,
                procedureRoom: req.body.procedureRoom,
                nurseName: req.body.nurseName,
                nursingAccount: req.body.nursingAccount || req.body.nurseName,
                doctorName: cathCase.doctorName,
                procedureName: cathCase.procedureName,
                patientType: cathCase.patientType,
                notes: req.body.notes
            },
            action: 'consume',
            description: `Recorded ${quantity} consumed item(s) for Cath Lab case ${cathCase.caseNumber}`
        });

        res.status(201).json({ success: true, message: 'Patient-wise consumption recorded', data: transaction });
    } catch (error) {
        console.error('Cath Lab consumption error:', error);
        res.status(500).json({ success: false, message: error.message || 'Error recording consumption' });
    }
};

exports.returnItems = async (req, res) => {
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
            return res.status(404).json({ success: false, message: 'Batch not found for return' });
        }

        await batch.addStock(quantity);

        const transactionType = req.body.reused === true ? 'reingest' : 'return';
        const transaction = await createStockTransaction({
            req,
            transactionType,
            batch,
            quantity,
            extra: {
                caseId: req.body.caseId,
                returnedAgainst: req.body.returnedAgainst,
                subStore: req.body.subStore,
                procedureRoom: req.body.procedureRoom,
                nurseName: req.body.nurseName,
                nursingAccount: req.body.nursingAccount || req.body.nurseName,
                notes: req.body.notes,
                status: transactionType === 'reingest' ? 'reingested' : 'returned'
            },
            action: transactionType === 'reingest' ? 'reingest' : 'return',
            description: `Returned ${quantity} item(s) from procedure room to Cath Lab sub-store for batch ${batch.batchNumber}`
        });

        res.status(201).json({ success: true, message: 'Cath Lab return recorded', data: transaction });
    } catch (error) {
        console.error('Cath Lab return error:', error);
        res.status(500).json({ success: false, message: error.message || 'Error recording return' });
    }
};

exports.dailySuggestions = async (req, res) => {
    try {
        const days = Math.max(1, parseInt(req.query.days || '30'));
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const pharmacyObjectId = getPharmacyObjectId(req.pharmacyId);

        const suggestions = await CathLabStockTransaction.aggregate([
            {
                $match: {
                    pharmacyId: pharmacyObjectId,
                    transactionType: 'consumption',
                    createdAt: { $gte: startDate },
                    masterMedicineId: { $ne: null }
                }
            },
            {
                $group: {
                    _id: {
                        masterMedicineId: '$masterMedicineId',
                        procedureRoom: '$procedureRoom'
                    },
                    totalConsumed: { $sum: '$quantity' },
                    totalCost: { $sum: '$totalCost' }
                }
            },
            {
                $lookup: {
                    from: 'mastermedicines',
                    localField: '_id.masterMedicineId',
                    foreignField: '_id',
                    as: 'medicine'
                }
            },
            { $unwind: { path: '$medicine', preserveNullAndEmptyArrays: true } },
            { $sort: { totalConsumed: -1 } },
            { $limit: 50 }
        ]);

        res.json({
            success: true,
            days,
            count: suggestions.length,
            data: suggestions.map(item => ({
                medicineId: item._id.masterMedicineId,
                medicineName: item.medicine?.name || 'Unknown item',
                procedureRoom: item._id.procedureRoom || 'General Cath Lab',
                totalConsumed: item.totalConsumed,
                minimumDailyIssue: Math.max(1, Math.ceil(item.totalConsumed / days)),
                averageDailyCost: Math.round((item.totalCost / days) * 100) / 100
            }))
        });
    } catch (error) {
        console.error('Cath Lab daily suggestions error:', error);
        res.status(500).json({ success: false, message: 'Error generating daily suggestions', error: error.message });
    }
};

exports.genericReport = async (req, res) => {
    try {
        const {
            q = '',
            transactionType,
            xAxis = 'procedure',
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
                { procedureName: { $regex: q, $options: 'i' } },
                { doctorName: { $regex: q, $options: 'i' } },
                { patientType: { $regex: q, $options: 'i' } },
                { nurseName: { $regex: q, $options: 'i' } },
                { procedureRoom: { $regex: q, $options: 'i' } },
                { notes: { $regex: q, $options: 'i' } }
            ];
        }

        const rows = await CathLabStockTransaction.find(query)
            .populate(transactionPopulate)
            .sort({ createdAt: -1 })
            .limit(Math.min(parseInt(limit), 1000))
            .lean();

        const graphData = groupRowsForAxis(rows, xAxis);

        await createAuditLog({
            req,
            action: 'generate_report',
            entity: 'cath_lab_stock_transaction',
            description: `Generated Cath Lab generic report with x-axis ${xAxis}`
        });

        res.json({
            success: true,
            count: rows.length,
            xAxis,
            data: rows,
            graphData
        });
    } catch (error) {
        console.error('Cath Lab generic report error:', error);
        res.status(500).json({ success: false, message: 'Error generating Cath Lab report', error: error.message });
    }
};
