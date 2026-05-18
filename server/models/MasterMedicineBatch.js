const mongoose = require('mongoose');

const masterMedicineBatchSchema = new mongoose.Schema({
    // Master Medicine Reference
    masterMedicineId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MasterMedicine',
        required: [true, 'Master Medicine reference is required'],
        index: true
    },

    // Pharmacy Association
    pharmacyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pharmacy',
        required: [true, 'Pharmacy reference is required'],
        index: true
    },

    // Batch Details
    batchNumber: {
        type: String,
        required: [true, 'Batch number is required'],
        unique: true,
        uppercase: true,
        trim: true,
        index: true
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [0, 'Quantity cannot be negative'],
        default: 0
    },

    // Pricing (Pharmacy-Specific)
    purchasePrice: {
        type: Number,
        required: [true, 'Purchase price is required'],
        min: [0, 'Purchase price cannot be negative']
    },
    mrp: {
        type: Number,
        required: [true, 'MRP is required'],
        min: [0, 'MRP cannot be negative']
    },
    sellingPrice: {
        type: Number,
        min: 0
    },
    discountPercentage: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    taxRate: {
        type: Number,
        min: 0,
        max: 100,
        default: 0 // Percentage
    },

    // Supplier Information
    supplierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier',
        required: [true, 'Supplier reference is required']
    },
    purchaseOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PurchaseOrder'
    },
    supplierInvoiceNumber: {
        type: String,
        trim: true
    },

    // Dates
    manufacturingDate: {
        type: Date,
        required: [true, 'Manufacturing date is required']
    },
    expiryDate: {
        type: Date,
        required: [true, 'Expiry date is required'],
        index: true
    },
    receivedDate: {
        type: Date,
        default: Date.now
    },

    // Identification
    barcode: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        index: true
    },
    qrCode: {
        type: String,
        trim: true
    },

    // Status
    status: {
        type: String,
        enum: ['available', 'low_stock', 'expired', 'recalled', 'sold_out', 'quarantined'],
        default: 'available',
        index: true
    },
    reorderLevel: {
        type: Number,
        default: 10,
        min: 0
    },

    // Regulatory
    isControlledDrug: {
        type: Boolean,
        default: false,
        index: true
    },
    requiresPrescription: {
        type: Boolean,
        default: false
    },

    // Storage
    storageLocation: {
        rack: String,
        shelf: String,
        bin: String
    },
    storageConditions: {
        type: String,
        enum: ['room_temperature', 'refrigerated', 'frozen', 'controlled_temperature'],
        default: 'room_temperature'
    },

    // Quality Control
    qualityCheckStatus: {
        type: String,
        enum: ['pending', 'passed', 'failed', 'not_required'],
        default: 'not_required'
    },
    qualityCheckDate: {
        type: Date
    },
    qualityCheckBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Notes
    notes: {
        type: String,
        trim: true
    },
    recallReason: {
        type: String,
        trim: true
    },

    // Tracking
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    isDeleted: {
        type: Boolean,
        default: false,
        index: true
    },
    deletedAt: {
        type: Date
    },
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

const makeInternalBarcode = () => `AFIC-BATCH-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

// Compound Indexes for Optimized Queries
masterMedicineBatchSchema.index({ masterMedicineId: 1, pharmacyId: 1 });
masterMedicineBatchSchema.index({ pharmacyId: 1, status: 1 });
masterMedicineBatchSchema.index({ pharmacyId: 1, expiryDate: 1, status: 1 });
masterMedicineBatchSchema.index({ pharmacyId: 1, isDeleted: 1, status: 1 });
masterMedicineBatchSchema.index({ batchNumber: 1 }, { unique: true });
masterMedicineBatchSchema.index({ barcode: 1 }, { sparse: true, unique: true });

// Virtual: Check if batch is expired
masterMedicineBatchSchema.virtual('isExpired').get(function () {
    return this.expiryDate < new Date();
});

// Virtual: Check if expiring soon (within 30 days)
masterMedicineBatchSchema.virtual('isExpiringSoon').get(function () {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return this.expiryDate <= thirtyDaysFromNow && this.expiryDate > new Date();
});

// Virtual: Check if low stock
masterMedicineBatchSchema.virtual('isLowStock').get(function () {
    return this.quantity > 0 && this.quantity <= this.reorderLevel;
});

// Virtual: Days until expiry
masterMedicineBatchSchema.virtual('daysUntilExpiry').get(function () {
    const now = new Date();
    const diffTime = this.expiryDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
});

// Virtual: Total value
masterMedicineBatchSchema.virtual('totalValue').get(function () {
    return this.quantity * (this.sellingPrice || this.mrp);
});

// Virtual: Profit margin
masterMedicineBatchSchema.virtual('profitMargin').get(function () {
    if (!this.purchasePrice || this.purchasePrice === 0) return 0;
    const sellingPrice = this.sellingPrice || this.mrp;
    return ((sellingPrice - this.purchasePrice) / this.purchasePrice) * 100;
});

// Method: Deduct stock
masterMedicineBatchSchema.methods.deductStock = async function (quantity) {
    if (this.quantity < quantity) {
        throw new Error(`Insufficient stock. Available: ${this.quantity}, Requested: ${quantity}`);
    }

    this.quantity -= quantity;

    // Update status based on quantity
    if (this.quantity === 0) {
        this.status = 'sold_out';
    } else if (this.quantity <= this.reorderLevel) {
        this.status = 'low_stock';
    }

    return this.save();
};

// Method: Add stock
masterMedicineBatchSchema.methods.addStock = async function (quantity) {
    this.quantity += quantity;

    // Update status if stock is replenished
    if (this.quantity > this.reorderLevel && this.status !== 'recalled' && this.status !== 'expired') {
        this.status = 'available';
    }

    return this.save();
};

// Method: Mark as recalled
masterMedicineBatchSchema.methods.recall = async function (reason, userId) {
    this.status = 'recalled';
    this.recallReason = reason;
    this.updatedBy = userId;
    return this.save();
};

// Method: Soft delete
masterMedicineBatchSchema.methods.softDelete = async function (userId) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = userId;
    return this.save();
};

// Pre-save hook: Update status based on expiry and quantity
masterMedicineBatchSchema.pre('validate', function () {
    if (!this.barcode) {
        this.barcode = makeInternalBarcode();
    }
});

// Pre-save hook: Update status based on expiry and quantity
masterMedicineBatchSchema.pre('save', async function () {
    // Check if expired
    if (this.expiryDate < new Date() && this.status !== 'recalled') {
        this.status = 'expired';
    }
    // Check quantity status
    else if (this.quantity === 0 && this.status !== 'recalled' && this.status !== 'expired') {
        this.status = 'sold_out';
    }
    else if (this.quantity > 0 && this.quantity <= this.reorderLevel && this.status !== 'recalled' && this.status !== 'expired') {
        this.status = 'low_stock';
    }
    else if (this.quantity > this.reorderLevel && this.status !== 'recalled' && this.status !== 'expired') {
        this.status = 'available';
    }

    // Calculate selling price if not set
    if (!this.sellingPrice && this.mrp && this.discountPercentage) {
        this.sellingPrice = this.mrp * (1 - this.discountPercentage / 100);
    }
});

// Static Method: Get pharmacy inventory with pagination
masterMedicineBatchSchema.statics.getPharmacyInventory = async function (pharmacyId, options) {
    const {
        page = 1,
        limit = 5,
        search = '',
        status = '',
        lowStock = false,
        expiring = false,
        sortBy = 'expiryDate',
        sortOrder = 'asc'
    } = options;

    const query = {
        pharmacyId,
        isDeleted: false
    };

    // Status filter
    if (status) {
        query.status = status;
    }

    // Expiring filter (within 30 days)
    if (expiring) {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        query.expiryDate = {
            $lte: thirtyDaysFromNow,
            $gt: new Date()
        };
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    let pipeline = [
        { $match: query },
        {
            $lookup: {
                from: 'mastermedicines',
                localField: 'masterMedicineId',
                foreignField: '_id',
                as: 'medicine'
            }
        },
        { $unwind: '$medicine' }
    ];

    // Search filter (applied after lookup)
    if (search) {
        pipeline.push({
            $match: {
                $or: [
                    { 'medicine.name': { $regex: search, $options: 'i' } },
                    { 'medicine.genericName': { $regex: search, $options: 'i' } },
                    { 'medicine.manufacturer': { $regex: search, $options: 'i' } },
                    { batchNumber: { $regex: search, $options: 'i' } }
                ]
            }
        });
    }

    // Get total count
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await this.aggregate(countPipeline);
    const totalRecords = countResult.length > 0 ? countResult[0].total : 0;

    // Get paginated data
    pipeline.push({ $sort: sort });
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    const data = await this.aggregate(pipeline);

    // Filter low stock if requested (done in memory for virtual field)
    let filteredData = data;
    if (lowStock) {
        filteredData = data.filter(batch => batch.quantity > 0 && batch.quantity <= batch.reorderLevel);
    }

    const totalPages = Math.ceil(totalRecords / limit);

    return {
        data: filteredData,
        pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalRecords,
            limit: parseInt(limit),
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        }
    };
};

module.exports = mongoose.model('MasterMedicineBatch', masterMedicineBatchSchema);
