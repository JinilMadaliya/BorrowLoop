const mongoose = require('mongoose');
const Item = require('../models/Item');
const Transaction = require('../models/Transaction');

const VALID_CONDITIONS = ['New', 'Like New', 'Good', 'Fair'];
const VALID_STATUSES = ['AVAILABLE', 'BORROWED', 'UNAVAILABLE'];

// @desc    Get all items (with optional search, category, location, condition, owner filters)
// @route   GET /api/items
// @access  Public
const getItems = async (req, res) => {
  try {
    const { keyword, category, location, condition, ownerId, status } = req.query;
    let query = {};

    // Search by title or description keyword
    if (keyword) {
      query.$or = [
        { title: { $regex: keyword.trim(), $options: 'i' } },
        { description: { $regex: keyword.trim(), $options: 'i' } }
      ];
    }

    if (category && category !== 'All') {
      query.category = category.trim();
    }

    if (location) {
      query.location = { $regex: location.trim(), $options: 'i' };
    }

    if (condition) {
      query.condition = condition.trim();
    }

    if (ownerId) {
      if (!mongoose.Types.ObjectId.isValid(ownerId)) {
        return res.status(400).json({ message: 'Invalid owner ID' });
      }
      query.ownerId = ownerId;
    }

    if (status) {
      query.status = status;
    }

    const items = await Item.find(query)
      .populate('ownerId', 'name rating ratingCount location profileImage')
      .sort({ createdAt: -1 });

    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// @desc    Get single item by ID
// @route   GET /api/items/:id
// @access  Public
const getItemById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const item = await Item.findById(req.params.id).populate(
      'ownerId',
      'name rating ratingCount location profileImage createdAt'
    );

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// @desc    Create a new item listing
// @route   POST /api/items
// @access  Private
const createItem = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      images,
      condition,
      pricePerDay,
      securityDeposit,
      location
    } = req.body;

    if (!title || !description || !category || !condition || !location) {
      return res.status(400).json({
        message: 'Please provide all required fields: title, description, category, condition, location'
      });
    }

    if (!VALID_CONDITIONS.includes(condition)) {
      return res.status(400).json({
        message: `Invalid condition. Allowed: ${VALID_CONDITIONS.join(', ')}`
      });
    }

    const parsedPrice = Number(pricePerDay) || 0;
    const parsedDeposit = Number(securityDeposit) || 0;

    if (parsedPrice < 0 || parsedDeposit < 0) {
      return res.status(400).json({ message: 'Price and deposit cannot be negative numbers' });
    }

    const item = await Item.create({
      ownerId: req.user._id,
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      images: Array.isArray(images) ? images : [],
      condition,
      pricePerDay: parsedPrice,
      securityDeposit: parsedDeposit,
      location: location.trim(),
      status: 'AVAILABLE'
    });

    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// @desc    Update an item listing
// @route   PUT /api/items/:id
// @access  Private
const updateItem = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Item not found' });
    }

    let item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Check if user is the owner of the item
    if (item.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'User not authorized to update this item' });
    }

    const {
      title,
      description,
      category,
      images,
      condition,
      pricePerDay,
      securityDeposit,
      location,
      status
    } = req.body;

    // Check if changing status to UNAVAILABLE while active in transaction
    if (status && status === 'UNAVAILABLE' && item.status === 'BORROWED') {
      const activeTx = await Transaction.findOne({
        itemId: item._id,
        status: { $in: ['ACTIVE', 'RETURN_REQUESTED'] }
      });
      if (activeTx) {
        return res.status(400).json({
          message: 'Cannot set item to UNAVAILABLE while it is actively borrowed'
        });
      }
    }

    if (condition && !VALID_CONDITIONS.includes(condition)) {
      return res.status(400).json({
        message: `Invalid condition. Allowed: ${VALID_CONDITIONS.join(', ')}`
      });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Allowed: ${VALID_STATUSES.join(', ')}`
      });
    }

    if (title !== undefined) item.title = title.trim();
    if (description !== undefined) item.description = description.trim();
    if (category !== undefined) item.category = category.trim();
    if (images !== undefined && Array.isArray(images)) item.images = images;
    if (condition !== undefined) item.condition = condition;
    if (pricePerDay !== undefined) item.pricePerDay = Math.max(0, Number(pricePerDay) || 0);
    if (securityDeposit !== undefined) item.securityDeposit = Math.max(0, Number(securityDeposit) || 0);
    if (location !== undefined) item.location = location.trim();
    if (status !== undefined) item.status = status;

    const updatedItem = await item.save();
    res.json(updatedItem);
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// @desc    Delete an item listing
// @route   DELETE /api/items/:id
// @access  Private
const deleteItem = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Check if user is the owner
    if (item.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'User not authorized to delete this item' });
    }

    // Check if item is actively in a transaction
    const activeTx = await Transaction.findOne({
      itemId: item._id,
      status: { $in: ['ACTIVE', 'RETURN_REQUESTED'] }
    });
    if (activeTx) {
      return res.status(400).json({
        message: 'Cannot delete item while it is currently borrowed in an active transaction'
      });
    }

    await item.deleteOne();
    res.json({ message: 'Item removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

module.exports = {
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem
};