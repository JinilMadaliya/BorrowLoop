const express = require('express');
const router = express.Router();
const {
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem
} = require('../controllers/itemController'); // Make sure this path matches your folder structure
const { protect } = require('../middleware/authMiddleware'); // Make sure this path matches your folder structure

router.route('/').get(getItems).post(protect, createItem);
router.route('/:id').get(getItemById).put(protect, updateItem).delete(protect, deleteItem);

module.exports = router;