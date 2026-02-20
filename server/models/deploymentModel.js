const mongoose = require('mongoose')

const deploymentSchema = new mongoose.Schema(
  {
    deploymentCode: {
      type: String,
      unique: true,
      index: true
    },

    // ------------- pickup details ------------- //
    pickups: [
      {
        tmoNo: {
          type: String,
          unique: false, // uniqueness is enforced at app level via counter
          sparse: true,
          index: true
        },
        pickupSite: {
          type: String,
          required: [true, 'Pick-up site is required']
        },
        municipality: {
          type: String,
          required: [true, 'Municipality is required']
        },
        fieldContactPerson: {
          type: String,
          required: [true, 'Field Contact Person is required']
        },
        fieldContactPersonNo: {
          type: String,
          required: [true, "Field Contact Person's No. is required"]
        },
        scheduledPickupTime: {
          type: String,
          required: [true, 'Scheduled Pickup Time is required']
        },
        estimatedWeightKg: {
          type: String,
          required: [true, 'Estimated Quantity is required']
        },
        actualWeightKg: {
          type: String,
          default: 0
        },
        sacksCount: {
          type: Number,
          default: 0
        },
        // per-pickup timeline
        pickupIn: {
          type: String,
          default: ''
        },
        pickupOut: {
          type: String,
          default: ''
        }
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
      required: [true, 'Truck type is required']
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      required: [true, 'Driver is required']
    },
    helperCount: {
      type: String,
      required: [true, 'Helper count is required']
    },

    // ------------- delivery details ------------- //
    destination: {
      type: String,
      required: [true, 'Destination is required']
    },
    receivingContactPerson: {
      type: String,
      required: [true, 'Receiving Contact Person is required']
    },
    receivingContactPersonNo: {
      type: String,
      required: [true, "Receiving Contact Person's No. is required"]
    },
    hybrid: {
      type: String,
      required: [true, 'Hybrid is required']
    },
    territory: {
      type: String,
      required: [true, 'Territory is required']
    },
    flagging: {
      type: String,
      required: [true, 'Flagging is required']
    },
    flaggingRemarks: {
      type: String
    },
    totalSacksCount: {
      type: Number,
      default: 0
    },

    // ------------- load details ------------- //
    totalWeightKg: {
      type: Number,
      default: 0
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
      replacementTruckType: String,
      replacementHelperCount: Number,
      replacedAt: String,
      reason: String,
      remarks: String
    },

    // ------------- timeline details ------------- //
    departed: {
      type: String,
      default: ''
    },
    pickupIn: {
      type: String,
      default: ''
    },
    pickupOut: {
      type: String,
      default: ''
    },
    destArrival: {
      type: String,
      default: ''
    },
    destDeparture: {
      type: String,
      default: ''
    },

    // ------------- other tags ------------- //
    status: {
      type: String,
      default: 'preparing'
    },
    cancellationReason: {
      type: String,
      default: ''
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

/**
 * Generate the next code for a given counter key.
 * @param {string} prefix        - e.g. 'DP' or 'TMO'
 * @param {string} monthKey      - e.g. '2502'
 * @param {string} counterPrefix - e.g. 'deployment' or 'tmo'
 */
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

deploymentSchema.pre('save', async function (next) {
  try {
    const now = new Date()
    const year = now.getFullYear().toString().slice(-2) // e.g. "25"
    const month = String(now.getMonth() + 1).padStart(2, '0') // e.g. "02"
    const monthKey = `${year}${month}` // e.g. "2502"

    // 1. Generate deploymentCode if this is a new document
    if (!this.deploymentCode) {
      this.deploymentCode = await generateCode('DP', monthKey, 'deployment')
    }

    // 2. Generate tmoNo for any pickup stop that doesn't have one yet
    //    (handles both initial creation and stops added during updates)
    //    Format: TMO + monthKey + 5-digit seq  →  e.g. TMO2502000001
    for (const pickup of this.pickups) {
      if (!pickup.tmoNo) {
        pickup.tmoNo = await generateCode('TMO', monthKey, 'tmo')
      }
    }

    next()
  } catch (error) {
    next(error)
  }
})

const Deployment = mongoose.model('Deployment', deploymentSchema)
module.exports = Deployment
