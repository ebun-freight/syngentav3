const mongoose = require('mongoose')

const driverSchema = new mongoose.Schema(
  {
    firstname: {
      type: String,
      required: [true, 'Firstname is required'],
      trim: true,
      minlength: [2, 'Firstname must be at least 2 characters long'],
      maxlength: [50, 'Firstname cannot exceed 50 characters'],
      match: [/^[a-zA-Z\s'-]+$/, 'Firstname must contain letters only']
    },
    lastname: {
      type: String,
      required: [true, 'Lastname is required'],
      trim: true,
      minlength: [2, 'Lastname must be at least 2 characters long'],
      maxlength: [50, 'Lastname cannot exceed 50 characters'],
      match: [/^[a-zA-Z\s'-]+$/, 'Lastname must contain letters only']
    },
    phoneNo: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^(?:\+639|09)\d{9}$/, 'Invalid phone number format']
    },
    licenseNo: {
      type: String,
      trim: true,
      uppercase: true,
      minlength: [5, 'License No. must be at least 5 characters long'],
      maxlength: [20, 'License No. cannot exceed 20 characters'],
      match: [
        /^[A-Z0-9-]+$/,
        'License No. must contain letters, numbers, or hyphens only'
      ]
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
    status: {
      type: String,
      trim: true,
      lowercase: true,
      default: 'available'
    },
    subcon: {
      type: String,
      required: [true, 'Subcon is required'],
      trim: true,
      maxlength: [100, 'Subcon name cannot exceed 100 characters']
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
    isSoftDeleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
)

const Driver = mongoose.model('Driver', driverSchema)
module.exports = Driver
