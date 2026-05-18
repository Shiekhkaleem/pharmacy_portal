const mongoose = require('mongoose');

const cathLabStockTransactionSchema = new mongoose.Schema({
    pharmacyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pharmacy',
        required: true,
        index: true
    },
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CathLabCase',
        index: true
    },
    transactionType: {
        type: String,
        enum: ['receipt', 'issue_to_procedure_room', 'consumption', 'return', 'reingest', 'stock_taking'],
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
    qrCode: String,
    scanCode: {
        type: String,
        trim: true,
        index: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 0
    },
    unitCost: {
        type: Number,
        default: 0
    },
    totalCost: {
        type: Number,
        default: 0
    },
    source: String,
    subStore: {
        type: String,
        trim: true,
        index: true
    },
    procedureRoom: {
        type: String,
        trim: true,
        index: true
    },
    nurseName: {
        type: String,
        trim: true,
        index: true
    },
    nursingAccount: String,
    doctorName: {
        type: String,
        trim: true,
        index: true
    },
    procedureName: {
        type: String,
        trim: true,
        index: true
    },
    patientType: {
        type: String,
        trim: true,
        index: true
    },
    returnedAgainst: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CathLabStockTransaction'
    },
    status: {
        type: String,
        enum: ['recorded', 'returned', 'reingested', 'void'],
        default: 'recorded'
    },
    notes: String,
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

cathLabStockTransactionSchema.pre('validate', function () {
    if (!this.totalCost && this.quantity && this.unitCost) {
        this.totalCost = this.quantity * this.unitCost;
    }
});

cathLabStockTransactionSchema.index({ pharmacyId: 1, transactionType: 1, createdAt: -1 });
cathLabStockTransactionSchema.index({ pharmacyId: 1, caseId: 1, createdAt: -1 });
cathLabStockTransactionSchema.index({ pharmacyId: 1, procedureName: 1, createdAt: -1 });
cathLabStockTransactionSchema.index({ pharmacyId: 1, doctorName: 1, createdAt: -1 });

module.exports = mongoose.model('CathLabStockTransaction', cathLabStockTransactionSchema);
