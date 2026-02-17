const express = require('express')
const {
  getAllSettings,
  addOptionValue,
  removeOptionValue
} = require('../controllers/SystemSettingsController')
const authenticateToken = require('../middlewares/auth')

const router = express.Router()

// all routes require authentication
router.use(authenticateToken)

router.get('/', getAllSettings)
router.post('/add-option', addOptionValue)
router.delete('/remove-option', removeOptionValue)

module.exports = router
