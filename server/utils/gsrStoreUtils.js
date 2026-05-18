const mongoose = require('mongoose');
const MasterMedicine = require('../models/MasterMedicine');
const MasterMedicineBatch = require('../models/MasterMedicineBatch');
const PharmacyAuditLog = require('../models/PharmacyAuditLog');

const toPositiveNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return fallback;
    }
    return parsed;
};

const toObjectId = (value) => {
    if (!value || !mongoose.isValidObjectId(value)) {
        return null;
    }
    return new mongoose.Types.ObjectId(String(value));
};

const findBatchByScan = async ({ pharmacyId, batchId, scanCode }) => {
    const query = {
        pharmacyId,
        isDeleted: false
    };

    if (batchId && mongoose.isValidObjectId(batchId)) {
        query._id = batchId;
    } else if (scanCode) {
        const or = [
            { barcode: scanCode },
            { qrCode: scanCode },
            { batchNumber: scanCode }
        ];

        if (mongoose.isValidObjectId(scanCode)) {
            or.push({ _id: scanCode });
        }

        query.$or = or;
    } else {
        return null;
    }

    return MasterMedicineBatch.findOne(query)
        .populate('masterMedicineId', 'name genericName manufacturer category strength dosageForm unitPrice barcode');
};

const findMedicineIdsForSearch = async (q) => {
    if (!q) {
        return [];
    }

    const medicines = await MasterMedicine.find({
        $or: [
            { name: { $regex: q, $options: 'i' } },
            { genericName: { $regex: q, $options: 'i' } },
            { manufacturer: { $regex: q, $options: 'i' } },
            { barcode: { $regex: q, $options: 'i' } }
        ],
        isActive: { $ne: false }
    }).select('_id');

    return medicines.map(medicine => medicine._id);
};

const buildTransactionMedicineFields = (batch) => {
    const medicine = batch?.masterMedicineId;

    return {
        masterMedicineId: medicine?._id || batch?.masterMedicineId,
        batchId: batch?._id,
        batchNumber: batch?.batchNumber,
        barcode: batch?.barcode || medicine?.barcode,
        qrCode: batch?.qrCode,
        unitPrice: batch?.purchasePrice || batch?.sellingPrice || batch?.mrp || medicine?.unitPrice || 0
    };
};

const createAuditLog = async ({ req, action, entity, entityId, description, changes }) => {
    return PharmacyAuditLog.createLog({
        pharmacyId: req.pharmacyId,
        userId: req.user._id,
        userName: req.user.name,
        action,
        entity,
        entityId,
        changes,
        description,
        metadata: {
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        }
    });
};

const groupRowsForAxis = (rows, xAxis, valueSelector = row => row.quantity || 0) => {
    const grouped = new Map();

    rows.forEach(row => {
        let key;

        switch (xAxis) {
            case 'date':
                key = new Date(row.createdAt).toISOString().slice(0, 10);
                break;
            case 'item':
                key = row.masterMedicineId?.name || row.batchNumber || 'Unknown item';
                break;
            case 'department':
                key = row.department || 'Unassigned department';
                break;
            case 'location':
                key = row.toLocation || row.fromLocation || row.subStore || 'Unassigned location';
                break;
            case 'doctor':
                key = row.doctorName || 'Unassigned doctor';
                break;
            case 'procedure':
                key = row.procedureName || 'Unassigned procedure';
                break;
            case 'patientType':
                key = row.patientType || 'Unassigned patient type';
                break;
            case 'nurse':
                key = row.nurseName || 'Unassigned nurse';
                break;
            case 'procedureRoom':
                key = row.procedureRoom || 'Unassigned procedure room';
                break;
            case 'transactionType':
            default:
                key = row.transactionType || 'transaction';
                break;
        }

        const existing = grouped.get(key) || { label: key, count: 0, quantity: 0, totalCost: 0 };
        existing.count += 1;
        existing.quantity += valueSelector(row);
        existing.totalCost += row.totalCost || 0;
        grouped.set(key, existing);
    });

    return Array.from(grouped.values()).sort((a, b) => b.quantity - a.quantity);
};

module.exports = {
    toPositiveNumber,
    toObjectId,
    findBatchByScan,
    findMedicineIdsForSearch,
    buildTransactionMedicineFields,
    createAuditLog,
    groupRowsForAxis
};
