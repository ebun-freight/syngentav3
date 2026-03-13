const mongoose = require('mongoose')

const systemSettingsSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      enum: {
        values: ['trucksDrivers', 'deployments'],
        message: '{VALUE} is not a valid category'
      }
    },
    field: {
      type: String,
      required: [true, 'Field is required'],
      trim: true,
      minlength: [2, 'Field must be at least 2 characters long'],
      maxlength: [100, 'Field cannot exceed 100 characters'],
      match: [
        /^[a-zA-Z0-9\s_-]+$/,
        'Field must contain letters, numbers, spaces, underscores, or hyphens only'
      ]
    },
    values: {
      type: [String],
      required: [true, 'Values are required'],
      validate: [
        {
          validator: arr => arr.length > 0,
          message: 'Values must contain at least one entry'
        },
        {
          validator: arr => arr.length <= 100,
          message: 'Values cannot exceed 100 entries'
        },
        {
          validator: arr =>
            arr.every(v => typeof v === 'string' && v.trim().length > 0),
          message: 'Each value must be a non-empty string'
        },
        {
          validator: arr => arr.every(v => v.length <= 100),
          message: 'Each value cannot exceed 100 characters'
        },
        {
          validator: arr =>
            new Set(arr.map(v => v.trim().toLowerCase())).size === arr.length,
          message: 'Values must not contain duplicates'
        }
      ]
    }
  },
  { timestamps: true }
)

// Normalize each string in values before saving
systemSettingsSchema.pre('save', function (next) {
  if (this.values) {
    this.values = this.values.map(v => v.trim())
  }
  next()
})

// Compound index to ensure unique category-field combinations
systemSettingsSchema.index({ category: 1, field: 1 }, { unique: true })

const SystemSettings = mongoose.model('SystemSettings', systemSettingsSchema)
module.exports = SystemSettings
