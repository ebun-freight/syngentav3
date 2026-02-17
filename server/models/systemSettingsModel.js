const mongoose = require('mongoose')

const systemSettingsSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['trucksDrivers', 'deployments'],
      trim: true
    },
    field: {
      type: String,
      required: [true, 'Field is required'],
      trim: true
    },
    values: {
      type: [String],
      required: [true, 'Values are required']
    }
  },
  { timestamps: true }
)

// Compound index to ensure unique category-field combinations
systemSettingsSchema.index({ category: 1, field: 1 }, { unique: true })

const SystemSettings = mongoose.model('SystemSettings', systemSettingsSchema)
module.exports = SystemSettings
