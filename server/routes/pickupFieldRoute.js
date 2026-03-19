const express = require('express')
const authenticateToken = require('../middlewares/auth')
const {
  deletePickupField,
  updatePickupField,
  getAllPickupFields,
  createPickupField
} = require('../controllers/PickupFieldController')
const router = express.Router()

router
  .route('/')
  .post(authenticateToken, createPickupField)
  .get(authenticateToken, getAllPickupFields)

router
  .route('/:id')
  .patch(authenticateToken, updatePickupField)
  .delete(authenticateToken, deletePickupField)

module.exports = router
