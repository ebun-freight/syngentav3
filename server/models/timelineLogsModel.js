const mongoose = require('mongoose')

const timelineLogSchema = new mongoose.Schema(
  {
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required']
    },
    action: {
      type: String,
      required: [true, 'Action is required']
    },
    status: {
      type: String,
      enum: ['preparing', 'ongoing', 'completed', 'canceled'],
      required: [true, 'Action status is required']
    },
    timestamp: {
      type: String,
      required: [true, 'Date and time is required'],
      trim: true
    },
    targetDeployment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deployment'
    }
  },
  {
    timestamps: true
  }
)

module.exports = mongoose.model('TimelineLog', timelineLogSchema)
