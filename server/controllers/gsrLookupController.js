const GsrLookup = require('../models/GsrLookup');
const { createAuditLog } = require('../utils/gsrStoreUtils');

exports.getLookups = async (req, res) => {
    try {
        const { module, type, active = 'true' } = req.query;
        const query = {};

        if (module) query.module = module;
        if (type) query.type = type;
        if (active !== 'all') query.isActive = active === 'true';

        const lookups = await GsrLookup.find(query)
            .sort({ module: 1, type: 1, sortOrder: 1, label: 1 })
            .lean();

        res.json({ success: true, count: lookups.length, data: lookups });
    } catch (error) {
        console.error('Get GSR lookups error:', error);
        res.status(500).json({ success: false, message: 'Error fetching lookup values', error: error.message });
    }
};

exports.createLookup = async (req, res) => {
    try {
        const lookup = await GsrLookup.create({
            ...req.body,
            createdBy: req.user._id
        });

        await createAuditLog({
            req,
            action: 'create',
            entity: 'gsr_lookup',
            entityId: lookup._id,
            description: `Created GSR lookup ${lookup.module}/${lookup.type}/${lookup.value}`
        });

        res.status(201).json({ success: true, message: 'Lookup value created', data: lookup });
    } catch (error) {
        console.error('Create GSR lookup error:', error);
        res.status(500).json({ success: false, message: 'Error creating lookup value', error: error.message });
    }
};

exports.updateLookup = async (req, res) => {
    try {
        const lookup = await GsrLookup.findById(req.params.id);
        if (!lookup) {
            return res.status(404).json({ success: false, message: 'Lookup value not found' });
        }

        const before = lookup.toObject();
        Object.assign(lookup, req.body, { updatedBy: req.user._id });
        await lookup.save();

        await createAuditLog({
            req,
            action: 'update',
            entity: 'gsr_lookup',
            entityId: lookup._id,
            changes: { before, after: lookup.toObject() },
            description: `Updated GSR lookup ${lookup.module}/${lookup.type}/${lookup.value}`
        });

        res.json({ success: true, message: 'Lookup value updated', data: lookup });
    } catch (error) {
        console.error('Update GSR lookup error:', error);
        res.status(500).json({ success: false, message: 'Error updating lookup value', error: error.message });
    }
};

exports.deleteLookup = async (req, res) => {
    try {
        const lookup = await GsrLookup.findById(req.params.id);
        if (!lookup) {
            return res.status(404).json({ success: false, message: 'Lookup value not found' });
        }

        lookup.isActive = false;
        lookup.updatedBy = req.user._id;
        await lookup.save();

        await createAuditLog({
            req,
            action: 'delete',
            entity: 'gsr_lookup',
            entityId: lookup._id,
            description: `Disabled GSR lookup ${lookup.module}/${lookup.type}/${lookup.value}`
        });

        res.json({ success: true, message: 'Lookup value disabled' });
    } catch (error) {
        console.error('Delete GSR lookup error:', error);
        res.status(500).json({ success: false, message: 'Error disabling lookup value', error: error.message });
    }
};
