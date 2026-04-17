const mongoose = require("mongoose");

const pickupFieldSchema = new mongoose.Schema(
  {
    // ------------- pickup details (copied from deploymentModel pickups) ------------- //
    tmoNo: {
      type: String,
      trim: true,
      uppercase: true,
      unique: false,
      sparse: true,
      index: true,
      maxlength: [20, "TMO No. cannot exceed 20 characters"],
    },
    pickupSite: {
      type: String,
      required: [true, "Pick-up site is required"],
      trim: true,
      maxlength: [100, "Pick-up site cannot exceed 100 characters"],
    },
    municipality: {
      type: String,
      required: [true, "Municipality is required"],
      trim: true,
      maxlength: [100, "Municipality cannot exceed 100 characters"],
    },
    fieldContactPerson: {
      type: String,
      required: [true, "Field Contact Person is required"],
      trim: true,
      maxlength: [100, "Field Contact Person cannot exceed 100 characters"],
      match: [
        /^[a-zA-Z\s'.,-]+$/,
        "Field Contact Person must contain letters only",
      ],
    },
    fieldContactPersonNo: {
      type: String,
      trim: true,
      match: [/^(?:\+639|09)\d{9}$/, "Invalid contact number format"],
      required: [true, "Field Contact Person No. is required"],
    },
    scheduledPickupTime: {
      type: String,
      trim: true,
      match: [
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/,
        "Invalid scheduled pickup time format (expected ISO datetime)",
      ],
    },
    estimatedWeightKg: {
      type: String,
      required: [true, "Estimated Weight is required"],
      trim: true,
      match: [/^\d+(\.\d{1,2})?$/, "Estimated weight must be a valid number"],
    },
    fieldWeightKg: {
      type: String,
      trim: true,
      default: "0",
      match: [/^\d+(\.\d{1,2})?$/, "Actual weight must be a valid number"],
    },
    plantWeightKg: {
      type: String,
      trim: true,
      default: "0",
      match: [/^\d+(\.\d{1,2})?$/, "Actual weight must be a valid number"],
    },
    sacksCount: {
      type: Number,
      default: 0,
      min: [0, "Sacks count cannot be negative"],
      validate: {
        validator: Number.isInteger,
        message: "Sacks count must be a whole number",
      },
    },
    pickupIn: {
      type: String,
      trim: true,
      default: "",
      match: [
        /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?)?$/,
        "Invalid pickup-in time format",
      ],
    },
    pickupOut: {
      type: String,
      trim: true,
      default: "",
      match: [
        /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?)?$/,
        "Invalid pickup-out time format",
      ],
    },

    // ------------- status & link ------------- //
    status: {
      type: String,
      trim: true,
      lowercase: true,
      enum: ["not_done", "ongoing", "completed"],
      default: "not_done",
    },
    deploymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Deployment",
      default: null,
    },
  },
  { timestamps: true },
);

const PickupField = mongoose.model("PickupField", pickupFieldSchema);
module.exports = PickupField;
