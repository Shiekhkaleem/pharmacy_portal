const mongoose = require('mongoose');

const gsrLookupSchema = new mongoose.Schema({
    module: {
        type: String,
        enum: ['main_store', 'cath_lab', 'master_admin', 'shared'],
        required: true,
        index: true
    },
    type: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    label: {
        type: String,
        required: true,
        trim: true
    },
    value: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    description: {
        type: String,
        trim: true
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    sortOrder: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

gsrLookupSchema.index({ module: 1, type: 1, value: 1 });

module.exports = mongoose.model('GsrLookup', gsrLookupSchema);
