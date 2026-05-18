const mongoose = require('mongoose');
const crypto = require('crypto');

const pharmacyAuditLogSchema = new mongoose.Schema({
    pharmacyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pharmacy',
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    userName: {
        type: String,
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: [
            'create',
            'update',
            'delete',
            'receive',
            'issue',
            'transfer',
            'return',
            'consume',
            'reingest',
            'stock_take',
            'generate_report',
            'dispense',
            'refund',
            'adjust_stock',
            'recall',
            'login',
            'logout',
            'approve',
            'reject',
            'validate',
            'reconcile'
        ]
    },
    entity: {
        type: String,
        required: true,
        enum: [
            'medicine',
            'batch',
            'master_medicine_batch',
            'prescription',
            'transaction',
            'inventory',
            'user',
            'shift',
            'fulfillment',
            'gsr_lookup',
            'medical_store_transaction',
            'cath_lab_case',
            'cath_lab_stock_transaction'
        ]
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true
    },
    changes: {
        before: mongoose.Schema.Types.Mixed,
        after: mongoose.Schema.Types.Mixed
    },
    metadata: {
        ipAddress: String,
        deviceInfo: String,
        userAgent: String,
        location: String
    },
    timestamp: {
        type: Date,
        default: Date.now,
        immutable: true,
        index: true
    },
    isTampered: {
        type: Boolean,
        default: false
    },
    hash: {
        type: String,
        required: true
    },
    previousHash: String,
    description: String
}, {
    timestamps: false // We use custom timestamp field
});

// Indexes
pharmacyAuditLogSchema.index({ pharmacyId: 1, timestamp: -1 });
pharmacyAuditLogSchema.index({ userId: 1, timestamp: -1 });
pharmacyAuditLogSchema.index({ entity: 1, entityId: 1 });
pharmacyAuditLogSchema.index({ action: 1, timestamp: -1 });

// Pre-validate hook to generate hash
pharmacyAuditLogSchema.pre('validate', async function () {
    if (this.isNew) {
        // Get the previous log entry to chain hashes
        const previousLog = await mongoose.model('PharmacyAuditLog')
            .findOne({ pharmacyId: this.pharmacyId })
            .sort({ timestamp: -1 });

        if (previousLog) {
            this.previousHash = previousLog.hash;
        }

        // Generate hash for this entry
        this.hash = this.generateHash();
    }
});

// Method to generate hash
pharmacyAuditLogSchema.methods.generateHash = function () {
    const data = {
        pharmacyId: this.pharmacyId.toString(),
        userId: this.userId.toString(),
        action: this.action,
        entity: this.entity,
        entityId: this.entityId ? this.entityId.toString() : '',
        timestamp: this.timestamp.toISOString(),
        previousHash: this.previousHash || ''
    };

    const dataString = JSON.stringify(data);
    return crypto.createHash('sha256').update(dataString).digest('hex');
};

// Method to verify hash integrity
pharmacyAuditLogSchema.methods.verifyHash = function () {
    const expectedHash = this.generateHash();
    return this.hash === expectedHash;
};

// Static method to verify audit trail integrity
pharmacyAuditLogSchema.statics.verifyAuditTrail = async function (pharmacyId) {
    const logs = await this.find({ pharmacyId })
        .sort({ timestamp: 1 });

    const tamperedLogs = [];

    for (let i = 0; i < logs.length; i++) {
        const log = logs[i];

        // Verify hash
        if (!log.verifyHash()) {
            tamperedLogs.push({
                logId: log._id,
                reason: 'Hash mismatch'
            });
            continue;
        }

        // Verify chain (except for first log)
        if (i > 0) {
            const previousLog = logs[i - 1];
            if (log.previousHash !== previousLog.hash) {
                tamperedLogs.push({
                    logId: log._id,
                    reason: 'Chain broken'
                });
            }
        }
    }

    return {
        isValid: tamperedLogs.length === 0,
        tamperedLogs
    };
};

// Static method to create audit log entry
pharmacyAuditLogSchema.statics.createLog = async function (data) {
    const log = new this({
        pharmacyId: data.pharmacyId,
        userId: data.userId,
        userName: data.userName,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        changes: data.changes,
        metadata: data.metadata,
        description: data.description
    });

    return await log.save();
};

// Prevent updates and deletes (immutable)
pharmacyAuditLogSchema.pre('findOneAndUpdate', function (next) {
    next(new Error('Audit logs cannot be updated'));
});

pharmacyAuditLogSchema.pre('findOneAndDelete', function (next) {
    next(new Error('Audit logs cannot be deleted'));
});

pharmacyAuditLogSchema.pre('remove', function (next) {
    next(new Error('Audit logs cannot be deleted'));
});

module.exports = mongoose.model('PharmacyAuditLog', pharmacyAuditLogSchema);
