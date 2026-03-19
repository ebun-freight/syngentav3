const mongoose = require('mongoose')

const deploymentSchema = new mongoose.Schema(
  {
    deploymentCode: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      index: true,
      maxlength: [20, 'Deployment code cannot exceed 20 characters']
    },

    // ── pickups: ObjectId references to PickupField documents ─────────────
    pickups: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PickupField'
      }
    ],

    // ------------- truck & driver details ------------- //
    truckId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Truck',
      required: [true, 'Truck is required']
    },
    truckType: {
      type: String,
      required: [true, 'Truck type is required'],
      trim: true,
      lowercase: true
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      required: [true, 'Driver is required']
    },
    helperCount: {
      type: String,
      required: [true, 'Helper count is required'],
      trim: true,
      match: [/^\d+$/, 'Helper count must be a non-negative whole number']
    },

    // ------------- delivery details ------------- //
    destination: {
      type: String,
      required: [true, 'Destination is required'],
      trim: true,
      maxlength: [150, 'Destination cannot exceed 150 characters']
    },
    receivingContactPerson: {
      type: String,
      required: [true, 'Receiving Contact Person is required'],
      trim: true,
      maxlength: [100, 'Receiving Contact Person cannot exceed 100 characters'],
      match: [
        /^[a-zA-Z\s'.,-]+$/,
        'Receiving Contact Person must contain letters only'
      ]
    },
    receivingContactPersonNo: {
      type: String,
      required: [true, "Receiving Contact Person's No. is required"],
      trim: true,
      match: [/^(?:\+639|09)\d{9}$/, 'Invalid contact number format']
    },
    hybrid: {
      type: String,
      required: [true, 'Hybrid is required'],
      trim: true,
      maxlength: [100, 'Hybrid cannot exceed 100 characters']
    },
    territory: {
      type: String,
      required: [true, 'Territory is required'],
      trim: true,
      maxlength: [100, 'Territory cannot exceed 100 characters']
    },
    flagging: {
      type: String,
      required: [true, 'Flagging is required'],
      trim: true,
      uppercase: true,
      maxlength: [50, 'Flagging cannot exceed 50 characters']
    },
    flaggingRemarks: {
      type: String,
      trim: true,
      maxlength: [300, 'Flagging remarks cannot exceed 300 characters'],
      default: ''
    },
    totalSacksCount: {
      type: Number,
      default: 0,
      min: [0, 'Total sacks count cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Total sacks count must be a whole number'
      }
    },

    // ------------- load details ------------- //
    totalWeightKg: {
      type: Number,
      default: 0,
      min: [0, 'Total weight cannot be negative']
    },

    // ------------- replacement details ------------- //
    replacement: {
      replacementTruckId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Truck'
      },
      replacementDriverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver'
      },
      replacementTruckType: {
        type: String,
        trim: true,
        lowercase: true
      },
      replacementHelperCount: {
        type: Number,
        min: [0, 'Replacement helper count cannot be negative'],
        validate: {
          validator: Number.isInteger,
          message: 'Replacement helper count must be a whole number'
        }
      },
      replacedAt: {
        type: String,
        trim: true,
        match: [
          /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?)?$/,
          'Invalid replacedAt time format'
        ]
      },
      reason: {
        type: String,
        trim: true,
        maxlength: [200, 'Replacement reason cannot exceed 200 characters']
      },
      remarks: {
        type: String,
        trim: true,
        maxlength: [300, 'Replacement remarks cannot exceed 300 characters']
      }
    },

    // ------------- timeline details ------------- //
    departed: {
      type: String,
      trim: true,
      default: '',
      match: [
        /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?)?$/,
        'Invalid departed time format'
      ]
    },
    pickupIn: {
      type: String,
      trim: true,
      default: '',
      match: [
        /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?)?$/,
        'Invalid pickup-in time format'
      ]
    },
    pickupOut: {
      type: String,
      trim: true,
      default: '',
      match: [
        /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?)?$/,
        'Invalid pickup-out time format'
      ]
    },
    destArrival: {
      type: String,
      trim: true,
      default: '',
      match: [
        /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?)?$/,
        'Invalid destination arrival time format'
      ]
    },
    destDeparture: {
      type: String,
      trim: true,
      default: '',
      match: [
        /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?)?$/,
        'Invalid destination departure time format'
      ]
    },

    // ------------- other tags ------------- //
    status: {
      type: String,
      trim: true,
      lowercase: true,
      default: 'preparing'
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: '',
      maxlength: [300, 'Cancellation reason cannot exceed 300 characters']
    },
    isTMOPrinted: {
      type: Boolean,
      default: false
    },
    isSoftDeleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
)

// ─── counters ──────────────────────────────────────────────────────────────────

const counterSchema = new mongoose.Schema({
  _id: String,
  seq: Number
})

const Counter = mongoose.model('Counter', counterSchema)

const generateCode = async (prefix, monthKey, counterPrefix) => {
  const counterId = `${counterPrefix}-${monthKey}`
  const counter = await Counter.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  )
  return `${prefix}${monthKey}${String(counter.seq).padStart(5, '0')}`
}

// ─── pre-save hook ─────────────────────────────────────────────────────────────
// tmoNo generation moved to the controller — assigned directly on PickupField docs

deploymentSchema.pre('save', async function (next) {
  try {
    const now = new Date()
    const year = now.getFullYear().toString().slice(-2)
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const monthKey = `${year}${month}`

    if (!this.deploymentCode) {
      this.deploymentCode = await generateCode('DP', monthKey, 'deployment')
    }

    next()
  } catch (error) {
    next(error)
  }
})

const Deployment = mongoose.model('Deployment', deploymentSchema)
module.exports = { Deployment, generateCode }
