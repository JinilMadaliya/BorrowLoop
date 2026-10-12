const Item = require('../models/Item');

// @desc    Get all items (with optional search and category filters)
// @route   GET /api/items
// @access  Public
const getItems = async (req, res) => {
  try {
    const { keyword, category, location, condition } = req.query;
    let query = {};

    // Search by title or description keyword
    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } }
      ];
    }

    if (category) {
      query.category = category;
    }

    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    if (condition) {
      query.condition = condition;
    }

    const items = await Item.find(query).populate('ownerId', 'name rating location profileImage');
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
    const item = await Item.findById(req.params.id).populate('ownerId', 'name rating location profileImage borrowCredits createdAt');
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
    const { title, description, category, images, condition, pricePerDay, securityDeposit, location } = req.body;

    const item = await Item.create({
      ownerId: req.user._id,
      title,
      description,
      category,
      images: images || [],
      condition,
      pricePerDay: pricePerDay || 0,
      securityDeposit: securityDeposit || 0,
      location
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
    let item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Check if user is the owner of the item
    if (item.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'User not authorized to update this item' });
    }

    item = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// @desc    Delete an item listing
// @route   DELETE /api/items/:id
// @access  Private
const deleteItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Check if user is the owner
    if (item.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'User not authorized to delete this item' });
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