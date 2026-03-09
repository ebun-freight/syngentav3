const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
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
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      unique: true,
      maxlength: [100, 'Email cannot exceed 100 characters'],
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format']
    },
    phoneNo: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^(?:\+639|09)\d{9}$/, 'Invalid phone number format']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      trim: true,
      minlength: [8, 'Password must be at least 8 characters long'],
      maxlength: [128, 'Password cannot exceed 128 characters']
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      trim: true,
      lowercase: true,
      enum: {
        values: ['head_admin', 'admin', 'visitor', 'subcon'],
        message: '{VALUE} is not a valid role'
      }
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      trim: true,
      lowercase: true,
      enum: {
        values: ['active', 'inactive', 'pending', 'rejected', 'revoked'],
        message: '{VALUE} is not a valid status'
      },
      default: 'pending'
    },
    subcon: {
      type: String,
      trim: true,
      maxlength: [100, 'Subcon name cannot exceed 100 characters'],
      default: null
    },
    loginCount: {
      type: Number,
      default: 0,
      min: [0, 'Login count cannot be negative']
    },
    lastLogin: {
      type: Date,
      validate: {
        validator: value => !value || value <= new Date(),
        message: 'Last login date cannot be in the future'
      }
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

const User = mongoose.model('User', userSchema)
module.exports = User
