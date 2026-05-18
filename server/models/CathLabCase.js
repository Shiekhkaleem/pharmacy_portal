const mongoose = require('mongoose');

const makeCode = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const cathLabCaseSchema = new mongoose.Schema({
    pharmacyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pharmacy',
        required: true,
        index: true
    },
    caseNumber: {
        type: String,
        unique: true,
        index: true
    },
    patientName: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    patientIdentifier: {
        type: String,
        trim: true,
        index: true
    },
    patientType: {
        type: String,
        trim: true,
        index: true
    },
    procedureName: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    doctorName: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    wristbandBarcode: {
        type: String,
        unique: true,
        index: true
    },
    basicInfo: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    status: {
        type: String,
        enum: ['registered', 'in_procedure', 'completed', 'cancelled'],
        default: 'registered',
        index: true
    },
    registeredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    completedAt: Date
}, {
    timestamps: true
});

cathLabCaseSchema.pre('validate', function () {
    if (!this.caseNumber) {
        this.caseNumber = makeCode('CLCASE');
    }

    if (!this.wristbandBarcode) {
        this.wristbandBarcode = makeCode('AFIC-CL');
    }
});

module.exports = mongoose.model('CathLabCase', cathLabCaseSchema);
