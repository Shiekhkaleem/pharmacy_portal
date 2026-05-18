const mongoose = require('mongoose');

const pharmacyUserSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    pharmacyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pharmacy',
        required: true,
        index: true
    },
    pharmacyRole: {
        type: String,
        enum: [
            'pharmacy_admin',
            'pharmacist',
            'cashier',
            'inventory_manager',
            'auditor',
            'cath_lab_admin',
            'cath_lab_store',
            'nursing_user',
            'procedure_room_user',
            'executive'
        ],
        required: true
    },
    pharmacyRoles: [{
        type: String,
        enum: [
            'pharmacy_admin',
            'pharmacist',
            'cashier',
            'inventory_manager',
            'auditor',
            'cath_lab_admin',
            'cath_lab_store',
            'nursing_user',
            'procedure_room_user',
            'executive'
        ]
    }],
    status: {
        type: String,
        enum: ['pending', 'active', 'suspended', 'inactive'],
        default: 'pending'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvalDate: Date,
    deviceIds: [{
        type: String
    }],
    lastLogin: Date,
    passwordLastChanged: Date,
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },
    twoFactorSecret: String,
    permissions: [{
        type: String
    }],
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Compound index for unique user-pharmacy combination
pharmacyUserSchema.index({ userId: 1, pharmacyId: 1 }, { unique: true });

// Index for querying by pharmacy and role
pharmacyUserSchema.index({ pharmacyId: 1, pharmacyRole: 1 });
pharmacyUserSchema.index({ pharmacyId: 1, pharmacyRoles: 1 });

// Index for status queries
pharmacyUserSchema.index({ status: 1 });

// Virtual to check if user is active
pharmacyUserSchema.virtual('isActive').get(function () {
    return this.status === 'active';
});

pharmacyUserSchema.virtual('allRoles').get(function () {
    return Array.from(new Set([this.pharmacyRole, ...(this.pharmacyRoles || [])].filter(Boolean)));
});

pharmacyUserSchema.pre('save', function () {
    const roles = Array.from(new Set([this.pharmacyRole, ...(this.pharmacyRoles || [])].filter(Boolean)));
    this.pharmacyRoles = roles;
});

// Method to approve user
pharmacyUserSchema.methods.approve = function (approverId) {
    this.status = 'active';
    this.approvedBy = approverId;
    this.approvalDate = new Date();
    return this.save();
};

// Method to suspend user
pharmacyUserSchema.methods.suspend = function () {
    this.status = 'suspended';
    return this.save();
};

// Method to update last login
pharmacyUserSchema.methods.updateLastLogin = function (deviceId) {
    this.lastLogin = new Date();
    if (deviceId && !this.deviceIds.includes(deviceId)) {
        this.deviceIds.push(deviceId);
        // Keep only last 5 devices
        if (this.deviceIds.length > 5) {
            this.deviceIds = this.deviceIds.slice(-5);
        }
    }
    return this.save();
};

// Ensure virtuals are included in JSON
pharmacyUserSchema.set('toJSON', { virtuals: true });
pharmacyUserSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('PharmacyUser', pharmacyUserSchema);
