const mongoose = require('mongoose');

const masterMedicineSchema = new mongoose.Schema({
    // Basic Information
    name: {
        type: String,
        required: [true, 'Medicine name is required'],
        trim: true,
        index: true
    },
    genericName: {
        type: String,
        trim: true,
        index: true
    },
    brandName: {
        type: String,
        trim: true
    },

    // Classification
    category: {
        type: String,
        required: [true, 'Category is required'],
        index: true,
        enum: [
            'Analgesic',
            'Antibiotic',
            'Antiviral',
            'Antifungal',
            'Antihistamine',
            'Antipyretic',
            'Anti-inflammatory',
            'Cardiovascular',
            'Gastrointestinal',
            'Respiratory',
            'Endocrine',
            'Neurological',
            'Vitamin/Supplement',
            'Dermatological',
            'Ophthalmic',
            'Other'
        ]
    },
    therapeuticClass: {
        type: String,
        trim: true
    },
    pharmacologicalClass: {
        type: String,
        trim: true
    },

    // Manufacturer Details
    manufacturer: {
        type: String,
        required: [true, 'Manufacturer is required'],
        trim: true,
        index: true
    },
    manufacturerCountry: {
        type: String,
        trim: true,
        default: 'Pakistan'
    },

    // Formulation
    strength: {
        type: String,
        trim: true // e.g., "500mg", "10ml"
    },
    dosageForm: {
        type: String,
        required: [true, 'Dosage form is required'],
        enum: [
            'tablet',
            'capsule',
            'syrup',
            'suspension',
            'injection',
            'cream',
            'ointment',
            'gel',
            'drops',
            'inhaler',
            'patch',
            'powder',
            'solution',
            'other'
        ]
    },
    packSize: {
        type: String,
        trim: true // e.g., "10 tablets", "100ml bottle"
    },
    route: {
        type: String,
        enum: ['oral', 'topical', 'parenteral', 'inhalation', 'ophthalmic', 'otic', 'rectal', 'other']
    },

    // Identification
    barcode: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        index: true
    },
    drapRegistrationNumber: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        index: true
    },
    ndc: {
        type: String, // National Drug Code
        sparse: true,
        trim: true
    },

    // Pricing (Base/Reference Price)
    unitPrice: {
        type: Number,
        min: 0,
        default: 0
    },
    currency: {
        type: String,
        default: 'PKR',
        enum: ['PKR', 'USD', 'EUR']
    },

    // Regulatory Information
    isControlledSubstance: {
        type: Boolean,
        default: false,
        index: true
    },
    controlledSubstanceSchedule: {
        type: String,
        enum: ['Schedule I', 'Schedule II', 'Schedule III', 'Schedule IV', 'Schedule V', null]
    },
    prescriptionRequired: {
        type: Boolean,
        default: false
    },
    drapApproved: {
        type: Boolean,
        default: false,
        index: true
    },
    approvalDate: {
        type: Date
    },

    // DRAP Synchronization
    drapSyncStatus: {
        type: String,
        enum: ['pending', 'synced', 'failed', 'manual'],
        default: 'manual',
        index: true
    },
    lastDrapSync: {
        type: Date
    },
    drapDataHash: {
        type: String // For detecting changes from DRAP
    },

    // Additional Information
    description: {
        type: String,
        trim: true
    },
    activeIngredients: [{
        name: String,
        strength: String
    }],
    contraindications: [String],
    sideEffects: [String],
    storageConditions: {
        type: String,
        trim: true
    },

    // Status
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    isDiscontinued: {
        type: Boolean,
        default: false,
        index: true
    },
    discontinuedDate: {
        type: Date
    },
    discontinuedReason: {
        type: String,
        trim: true
    },

    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

const makeInternalBarcode = () => `AFIC-ITEM-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

// Compound Indexes for Optimized Queries (50k+ records)
masterMedicineSchema.index({ name: 1, manufacturer: 1 });
masterMedicineSchema.index({ genericName: 1, category: 1 });
masterMedicineSchema.index({ manufacturer: 1, category: 1, isActive: 1 });
masterMedicineSchema.index({ isActive: 1, isDiscontinued: 1, drapApproved: 1 });

// Text Index for Full-Text Search
masterMedicineSchema.index({
    name: 'text',
    genericName: 'text',
    manufacturer: 'text',
    brandName: 'text'
}, {
    weights: {
        name: 10,
        genericName: 5,
        brandName: 3,
        manufacturer: 3
    },
    name: 'MasterMedicineTextIndex'
});

masterMedicineSchema.pre('validate', function () {
    if (!this.barcode) {
        this.barcode = makeInternalBarcode();
    }
});

// Virtual: Full Display Name
masterMedicineSchema.virtual('fullName').get(function () {
    let fullName = this.name;
    if (this.strength) {
        fullName += ` ${this.strength}`;
    }
    if (this.dosageForm) {
        fullName += ` (${this.dosageForm})`;
    }
    return fullName;
});

// Virtual: Is DRAP Synced
masterMedicineSchema.virtual('isDrapSynced').get(function () {
    return this.drapSyncStatus === 'synced';
});

// Static Method: Search with Pagination
masterMedicineSchema.statics.searchWithPagination = async function (filters, options) {
    const {
        page = 1,
        limit = 5,
        search = '',
        manufacturer = '',
        genericName = '',
        category = '',
        dosageForm = '',
        isControlledSubstance,
        sortBy = 'name',
        sortOrder = 'asc'
    } = options;

    const query = {
        // Broaden query for troubleshooting
        isActive: { $ne: false },
        isDiscontinued: { $ne: true }
    };

    // Text search
    if (search) {
        query.$text = { $search: search };
    }

    // Filters
    if (manufacturer) {
        query.manufacturer = { $regex: manufacturer, $options: 'i' };
    }
    if (genericName) {
        query.genericName = { $regex: genericName, $options: 'i' };
    }
    if (category) {
        query.category = category;
    }
    if (dosageForm) {
        query.dosageForm = dosageForm;
    }
    if (typeof isControlledSubstance === 'boolean') {
        query.isControlledSubstance = isControlledSubstance;
    }

    // Apply additional filters
    if (filters) {
        Object.assign(query, filters);
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    const [data, totalRecords] = await Promise.all([
        this.find(query)
            .select('-drapDataHash -__v')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean(),
        this.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalRecords / limit);

    return {
        data,
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

// Static Method: Get Filter Options
masterMedicineSchema.statics.getFilterOptions = async function () {
    const [manufacturers, categories, dosageForms, genericNames] = await Promise.all([
        this.distinct('manufacturer', { isActive: true }),
        this.distinct('category', { isActive: true }),
        this.distinct('dosageForm', { isActive: true }),
        this.distinct('genericName', { isActive: true, genericName: { $ne: null, $ne: '' } })
    ]);

    return {
        manufacturers: manufacturers.sort(),
        categories: categories.sort(),
        dosageForms: dosageForms.sort(),
        genericNames: genericNames.sort()
    };
};

// module.exports
module.exports = mongoose.model('MasterMedicine', masterMedicineSchema);
