const mongoose = require('mongoose');

const medicalStoreTransactionSchema = new mongoose.Schema({
    pharmacyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pharmacy',
        required: true,
        index: true
    },
    transactionType: {
        type: String,
        enum: ['receipt', 'issue', 'transfer', 'adjustment', 'stock_taking', 'report_generation'],
        required: true,
        index: true
    },
    masterMedicineId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MasterMedicine',
        index: true
    },
    batchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MasterMedicineBatch',
        index: true
    },
    batchNumber: {
        type: String,
        trim: true,
        index: true
    },
    barcode: {
        type: String,
        trim: true,
        index: true
    },
    qrCode: {
        type: String,
        trim: true
    },
    scanCode: {
        type: String,
        trim: true,
        index: true
    },
    quantity: {
        type: Number,
        default: 0
    },
    previousQuantity: Number,
    countedQuantity: Number,
    unitPrice: {
        type: Number,
        default: 0
    },
    totalCost: {
        type: Number,
        default: 0
    },
    source: {
        type: String,
        trim: true
    },
    department: {
        type: String,
        trim: true,
        index: true
    },
    fromLocation: {
        type: String,
        trim: true
    },
    toLocation: {
        type: String,
        trim: true
    },
    receiverName: {
        type: String,
        trim: true
    },
    issuedToRole: {
        type: String,
        trim: true
    },
    itemMetadata: {
        storeType: String,
        potency: String,
        distributionMechanism: String,
        packagingUnit: String,
        accountingQuantity: Number,
        dosageMethod: String
    },
    report: {
        name: String,
        xAxis: String,
        filters: mongoose.Schema.Types.Mixed
    },
    reason: String,
    notes: String,
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

medicalStoreTransactionSchema.pre('validate', function () {
    if (!this.totalCost && this.quantity && this.unitPrice) {
        this.totalCost = this.quantity * this.unitPrice;
    }
});

medicalStoreTransactionSchema.index({ pharmacyId: 1, transactionType: 1, createdAt: -1 });
medicalStoreTransactionSchema.index({ pharmacyId: 1, department: 1, createdAt: -1 });
medicalStoreTransactionSchema.index({ pharmacyId: 1, masterMedicineId: 1, createdAt: -1 });

module.exports = mongoose.model('MedicalStoreTransaction', medicalStoreTransactionSchema);
