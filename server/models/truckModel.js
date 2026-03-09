const mongoose = require('mongoose')

const truckSchema = new mongoose.Schema(
  {
    plateNo: {
      type: String,
      required: [true, 'Plate No. is required'],
      trim: true,
      uppercase: true,
      minlength: [2, 'Plate No. must be at least 2 characters long'],
      maxlength: [7, 'Plate No. cannot exceed 7 characters'],
      match: [/^[A-Z0-9\s-]+$/, 'Plate No. must contain letters, numbers, spaces, or hyphens only']
    },
    truckType: {
      type: String,
      trim: true,
      lowercase: true,
      enum: {
        values: [
          'single-tire',
          'elf',
          'forward',
          '10-wheeler',
          '12-wheeler',
          'wing-van',
          'L300',
          'multicab'
        ],
        message: '{VALUE} is not a valid truck type'
      }
    },
    maxLoad: {
      type: Number,
      min: [0, 'Max load cannot be negative'],
      max: [100000, 'Max load cannot exceed 100,000 kg'],
      validate: {
        validator: Number.isInteger,
        message: 'Max load must be a whole number'
      }
    },
    status: {
      type: String,
      trim: true,
      lowercase: true,
      enum: {
        values: ['available', 'deployed', 'unavailable'],
        message: '{VALUE} is not a valid status'
      },
      default: 'available'
    },
    tripCount: {
      type: Number,
      default: 0,
      min: [0, 'Trip count cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Trip count must be a whole number'
      }
    },
    subcon: {
      type: String,
      required: [true, 'Subcon is required'],
      trim: true,
      maxlength: [100, 'Subcon name cannot exceed 100 characters']
    },
    imageUrl: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Image URL cannot exceed 500 characters'],
      match: [/^(https?:\/\/.*)?$/, 'Invalid image URL format']
    },
    imagePublicId: {
      type: String,
      trim: true,
      default: '',
      maxlength: [200, 'Image public ID cannot exceed 200 characters']
    },
    isSoftDeleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
)

const Truck = mongoose.model('Truck', truckSchema)
module.exports = Truck