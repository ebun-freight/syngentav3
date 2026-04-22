const createError = require("http-errors");
const { validateFields } = require("../utils/validationFields");
const PickupField = require("../models/pickupFieldModel");
const ActivityLog = require("../models/activityLogsModel");

// ─── Create Pickup Field ───────────────────────────────────────────────────────

const createPickupField = async (req, res, next) => {
  try {
    if (!["head_admin", "admin"].includes(req.user.role)) {
      return next(createError(403, "Access denied"));
    }

    const {
      pickupSite,
      municipality,
      fieldContactPerson,
      fieldContactPersonNo,
      scheduledPickupTime,
      estimatedWeightKg,
      hybrid,
      territory,
      flagging,
      flaggingRemarks,
    } = req.body;

    // Validate only required fields (contact person & number are optional now)
    validateFields(
      {
        pickupSite,
        municipality,
        estimatedWeightKg,
      },
      false,
    );

    const newField = await PickupField.create({
      pickupSite,
      municipality,
      fieldContactPerson: fieldContactPerson || undefined,
      fieldContactPersonNo: fieldContactPersonNo || undefined,
      scheduledPickupTime: scheduledPickupTime || undefined,
      estimatedWeightKg,
      hybrid: hybrid || undefined,
      territory: territory || undefined,
      flagging: flagging?.toLowerCase() || undefined,
      flaggingRemarks: flaggingRemarks || undefined,
      status: "not_done",
      deploymentId: null,
    });

    ActivityLog.create({
      type: "pickup_field",
      performedBy: req.user._id,
      action: `Pickup field created: ${newField.pickupSite} (${newField.municipality})`,
    }).catch((err) =>
      console.error("ActivityLog error (createPickupField):", err),
    );

    return res.status(201).json({
      message: "Pickup field created successfully",
      pickupField: newField,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get All Pickup Fields ─────────────────────────────────────────────────────

const getAllPickupFields = async (req, res, next) => {
  try {
    const {
      status,
      search,
      sort = "latest",
      page = 1,
      perPage = 200,
      unassignedOnly,
    } = req.query;

    let query = PickupField.find();

    if (status && status !== "") {
      query = query.where("status").equals(status);
    }

    // Only return fields not yet linked to a deployment
    if (unassignedOnly === "true") {
      query = query.where("status").equals("not_done");
    }

    const sortOptions = { oldest: { createdAt: 1 }, latest: { createdAt: -1 } };
    query = query.sort(sortOptions[sort] || sortOptions.latest);

    const limit = parseInt(perPage);
    const skip = (parseInt(page) - 1) * limit;
    query = query.skip(skip).limit(limit);

    let fields = await query.populate(
      "deploymentId",
      "deploymentCode status pickups",
    );

    if (search && search !== "") {
      const s = search.toLowerCase();
      fields = fields.filter(
        (f) =>
          f.pickupSite?.toLowerCase().includes(s) ||
          f.municipality?.toLowerCase().includes(s) ||
          f.fieldContactPerson?.toLowerCase().includes(s) ||
          f.tmoNo?.toLowerCase().includes(s),
      );
    }

    const total = await PickupField.countDocuments(
      status && status !== "" ? { status } : {},
    );

    return res.status(200).json({
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      pickupFields: fields,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Update Pickup Field ───────────────────────────────────────────────────────

const updatePickupField = async (req, res, next) => {
  try {
    if (!["head_admin", "admin"].includes(req.user.role)) {
      return next(createError(403, "Access denied"));
    }

    const { id } = req.params;
    const {
      pickupSite,
      municipality,
      fieldContactPerson,
      fieldContactPersonNo,
      scheduledPickupTime,
      estimatedWeightKg,
      fieldWeightKg,
      plantWeightKg,
      sacksCount,
      pickupIn,
      pickupOut,
      hybrid,
      territory,
      flagging,
      flaggingRemarks,
    } = req.body;

    const field = await PickupField.findById(id);
    if (!field) return next(createError(404, "Pickup field not found"));

    const safeNumStr = (val, fallback) =>
      val !== undefined && val !== null
        ? String(val).trim() === ""
          ? "0"
          : String(val)
        : fallback;

    Object.assign(field, {
      pickupSite: pickupSite ?? field.pickupSite,
      municipality: municipality ?? field.municipality,
      fieldContactPerson: fieldContactPerson ?? field.fieldContactPerson,
      fieldContactPersonNo: fieldContactPersonNo ?? field.fieldContactPersonNo,
      scheduledPickupTime: scheduledPickupTime || undefined,
      estimatedWeightKg: safeNumStr(estimatedWeightKg, field.estimatedWeightKg),
      fieldWeightKg: safeNumStr(fieldWeightKg, field.fieldWeightKg),
      plantWeightKg: safeNumStr(plantWeightKg, field.plantWeightKg),
      sacksCount:
        sacksCount !== undefined && sacksCount !== ""
          ? Number(sacksCount)
          : field.sacksCount,
      pickupIn: pickupIn !== undefined ? pickupIn || "" : field.pickupIn,
      pickupOut: pickupOut !== undefined ? pickupOut || "" : field.pickupOut,
      hybrid: hybrid !== undefined ? hybrid || undefined : field.hybrid,
      territory:
        territory !== undefined ? territory || undefined : field.territory,
      flagging:
        flagging !== undefined
          ? flagging?.toLowerCase() || undefined
          : field.flagging,
      flaggingRemarks:
        flaggingRemarks !== undefined ? flaggingRemarks : field.flaggingRemarks,
    });

    await field.save();

    // ── Sync changes to linked deployment stop ────────────────────────────
    if (field.deploymentId && field.tmoNo) {
      try {
        const { Deployment } = require("../models/deploymentModel");
        const deployment = await Deployment.findById(field.deploymentId);
        if (deployment) {
          let synced = false;
          deployment.pickups = deployment.pickups.map((stop) => {
            if (stop.tmoNo === field.tmoNo) {
              synced = true;
              return {
                ...stop.toObject(),
                pickupSite: field.pickupSite,
                municipality: field.municipality,
                fieldContactPerson: field.fieldContactPerson,
                fieldContactPersonNo: field.fieldContactPersonNo,
                scheduledPickupTime: field.scheduledPickupTime,
                estimatedWeightKg: field.estimatedWeightKg,
              };
            }
            return stop;
          });
          if (synced) {
            deployment.markModified("pickups");
            await deployment.save();
          }
        }
      } catch (err) {
        console.error("Error syncing pickup field update to deployment:", err);
      }
    }

    ActivityLog.create({
      type: "pickup_field",
      performedBy: req.user._id,
      action: `Pickup field updated: ${field.pickupSite} (${field.municipality})`,
    }).catch((err) =>
      console.error("ActivityLog error (updatePickupField):", err),
    );

    await field.populate("deploymentId", "deploymentCode status");

    return res.status(200).json({
      message: "Pickup field updated successfully",
      pickupField: field,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Delete Pickup Field ───────────────────────────────────────────────────────

const deletePickupField = async (req, res, next) => {
  try {
    if (!["head_admin", "admin"].includes(req.user.role)) {
      return next(createError(403, "Access denied"));
    }

    const { id } = req.params;
    const field = await PickupField.findById(id);
    if (!field) return next(createError(404, "Pickup field not found"));

    if (field.status !== "not_done") {
      return next(
        createError(
          400,
          "Cannot delete a pickup field that is ongoing or completed",
        ),
      );
    }

    const label = `${field.pickupSite} (${field.municipality})`;
    await field.deleteOne();

    ActivityLog.create({
      type: "pickup_field",
      performedBy: req.user._id,
      action: `Pickup field deleted: ${label}`,
    }).catch((err) =>
      console.error("ActivityLog error (deletePickupField):", err),
    );

    return res
      .status(200)
      .json({ message: "Pickup field deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPickupField,
  getAllPickupFields,
  updatePickupField,
  deletePickupField,
};
