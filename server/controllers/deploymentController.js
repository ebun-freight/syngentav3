const createError = require("http-errors");
const { validateFields } = require("../utils/validationFields");
const { Deployment, generateCode } = require("../models/deploymentModel");
const Truck = require("../models/truckModel");
const Driver = require("../models/driverModel");
const ActivityLog = require("../models/activityLogsModel");
const TimelineLog = require("../models/timelineLogsModel");
const PickupField = require("../models/pickupFieldModel");
const { DateTime } = require("luxon");

const MANILA_TZ = "Asia/Manila";

/**
 * Parse a bare datetime string (e.g. "2024-01-15T14:30") as Manila time
 * and return a UTC JS Date for storage in MongoDB type:Date fields.
 *
 * Without this, new Date("2024-01-15T14:30") uses the SERVER system timezone:
 *   - local  (UTC+8) → stored correctly as 06:30 UTC
 *   - live   (UTC)   → stored wrong as 14:30 UTC (8 hrs off)
 */
const toManilaDate = (str) => {
  if (!str) return null;
  const dt = DateTime.fromISO(str, { zone: MANILA_TZ });
  return dt.isValid ? dt.toJSDate() : null;
};

// Helper: build the month key used in TMO / DP code generation (e.g. "2603")
const getMonthKey = () => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}${month}`;
};

// Helper: get active subcon (replacement truck takes priority)
const getActiveSubcon = (deployment) => {
  if (deployment.replacement?.replacementTruckId?.subcon) {
    return deployment.replacement.replacementTruckId.subcon;
  }
  return deployment.truckId?.subcon || "";
};

// Helper: map a pickup object, preserving tmoNo if it exists
const mapPickup = (p) => ({
  tmoNo: p.tmoNo || undefined,
  pickupSite: p.pickupSite,
  municipality: p.municipality,
  fieldContactPerson: p.fieldContactPerson,
  fieldContactPersonNo: p.fieldContactPersonNo,
  scheduledPickupTime: p.scheduledPickupTime,
  estimatedWeightKg: p.estimatedWeightKg,
  fieldWeightKg: p.fieldWeightKg || "",
  plantWeightKg: p.plantWeightKg || "",
  pickupIn: p.pickupIn || "",
  pickupOut: p.pickupOut || "",
  sacksCount:
    p.sacksCount !== undefined && p.sacksCount !== ""
      ? Number(p.sacksCount)
      : 0,
});

/**
 * Reset pickup fields back to not_done.
 * Accepts:
 *   - fieldIds:    array of PickupField ObjectIds  (update-path stop removal)
 *   - tmoNos:      array of tmoNo strings          (legacy stop-level removal)
 *   - deploymentId: single ObjectId               (bulk release on cancel/delete)
 */
const releasePickupFields = async ({
  fieldIds,
  tmoNos,
  deploymentId,
  resetOperational = false,
} = {}) => {
  try {
    // Base reset: always restore status, tmoNo, and deploymentId link
    const reset = { status: "not_done", tmoNo: null, deploymentId: null };

    // Operational reset: clear all field-level data collected during the deployment
    if (resetOperational) {
      reset.fieldWeightKg = "0";
      reset.plantWeightKg = "0";
      reset.sacksCount = 0;
      reset.pickupIn = "";
      reset.pickupOut = "";
    }

    if (fieldIds && fieldIds.length > 0) {
      await PickupField.updateMany({ _id: { $in: fieldIds } }, reset);
    } else if (tmoNos && tmoNos.length > 0) {
      await PickupField.updateMany({ tmoNo: { $in: tmoNos } }, reset);
    } else if (deploymentId) {
      await PickupField.updateMany({ deploymentId }, reset);
    }
  } catch (err) {
    console.error("releasePickupFields error:", err);
  }
};

// Helper: apply a date range filter.
// isISO=false -> field is a native MongoDB Date (createdAt)
// isISO=true  -> field is stored as an ISO string (departed, destDeparture)
const applyDateRange = (query, field, from, to, isISO = false) => {
  if (from) {
    const [year, month, day] = from.split("-").map(Number);
    const start = DateTime.fromObject(
      { year, month, day, hour: 0, minute: 0, second: 0, millisecond: 0 },
      { zone: MANILA_TZ },
    );
    if (!start.isValid) return query;
    query = query.where(field).gte(isISO ? start.toISO() : start.toJSDate());
  }
  if (to) {
    const [year, month, day] = to.split("-").map(Number);
    const end = DateTime.fromObject(
      { year, month, day, hour: 23, minute: 59, second: 59, millisecond: 999 },
      { zone: MANILA_TZ },
    );
    if (!end.isValid) return query;
    query = query.where(field).lte(isISO ? end.toISO() : end.toJSDate());
  }
  return query;
};

// Helper: apply a simple string equality filter (skips if value is empty)
const applyStringFilter = (query, field, value) => {
  if (!value || value === "") return query;
  return query.where(field).equals(value);
};

// ─── Create deployment ─────────────────────────────────────────────────────────

const createDeployment = async (req, res, next) => {
  try {
    const {
      pickups,
      pickupFieldIds,
      truckId,
      driverId,
      truckType,
      helperCount,
      destination,
      receivingContacts,
      totalSacksCount,
      totalWeightKg,
      departed,
      destArrival,
      destDeparture,
      isTMOPrinted = false,
    } = req.body;

    if (!["head_admin", "admin"].includes(req.user.role)) {
      return next(createError(403, "Access denied"));
    }

    validateFields({
      truckId,
      driverId,
      truckType,
      destination,
    });

    // helperCount can legitimately be 0, so validate it separately
    if (
      helperCount === undefined ||
      helperCount === null ||
      helperCount === ""
    ) {
      return next(createError(400, "Helper count is required"));
    }

    if (
      !pickupFieldIds ||
      !Array.isArray(pickupFieldIds) ||
      pickupFieldIds.length === 0
    ) {
      return next(createError(400, "At least one pickup field is required"));
    }

    const truck = await Truck.findById(truckId);
    if (!truck) return next(createError(404, "Truck not found"));
    // if (truck.status === "deployed")
    //   return next(createError(400, "Truck is already deployed"));

    const driver = await Driver.findById(driverId);
    if (!driver) return next(createError(404, "Driver not found"));
    // if (driver.status === "deployed")
    //   return next(createError(400, "Driver is already deployed"));

    const newDeployment = await Deployment.create({
      pickups: pickupFieldIds,
      truckId,
      driverId,
      truckType,
      helperCount,
      destination,
      receivingContacts,
      totalSacksCount: totalSacksCount || 0,
      totalWeightKg: totalWeightKg || 0,
      departed: departed || "",
      destArrival: destArrival || "",
      destDeparture: destDeparture || "",
      isTMOPrinted,
      isSoftDeleted: false,
    });

    await Promise.all([
      Truck.findByIdAndUpdate(truckId, { status: "deployed" }),
      Driver.findByIdAndUpdate(driverId, { status: "deployed" }),
    ]);

    const initialStatus = departed ? "ongoing" : "preparing";

    await TimelineLog.create({
      performedBy: req.user._id,
      action: "Truck assigned for deployment",
      status: initialStatus,
      timestamp: DateTime.now().setZone(MANILA_TZ).toISO(),
      targetDeployment: newDeployment._id,
    });

    await ActivityLog.create({
      type: "deployment",
      performedBy: req.user._id,
      action: `${
        newDeployment.deploymentCode
      }: Assigned ${truck.plateNo.toUpperCase()} to deployment`,
      targetDeployment: newDeployment._id,
    });

    const populatedDeployment = await Deployment.findById(newDeployment._id)
      .populate("truckId")
      .populate("driverId")
      .populate("pickups");

    // ── Assign tmoNo + link each PickupField to this deployment ───────────
    const monthKey = getMonthKey();
    await Promise.all(
      pickupFieldIds.map(async (fieldId) => {
        const tmoNo = await generateCode("TMO", monthKey, "tmo");
        return PickupField.findByIdAndUpdate(fieldId, {
          status: "ongoing",
          deploymentId: newDeployment._id,
          tmoNo,
        });
      }),
    );

    res.status(201).json({
      message: "Deployment created successfully",
      deployment: populatedDeployment,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get all deployments ───────────────────────────────────────────────────────

const getAllDeployments = async (req, res, next) => {
  try {
    let {
      status,
      search,
      sort = "latest",
      assignedAtFrom,
      assignedAtTo,
      departedAtFrom,
      departedAtTo,
      completedAtFrom,
      completedAtTo,
      perPage = 200,
      page = 1,
      includeDeleted = false,
      subcon,
    } = req.query;

    if (completedAtFrom || completedAtTo) status = "completed";

    const subconFilter =
      req.user.role === "subcon" && req.user.subcon
        ? req.user.subcon.toLowerCase()
        : subcon && subcon !== ""
          ? subcon.toLowerCase()
          : null;

    let baseQuery = Deployment.find();

    if (includeDeleted !== "true")
      baseQuery = baseQuery.where("isSoftDeleted").ne(true);
    if (status && status !== "")
      baseQuery = baseQuery.where("status").equals(status);

    baseQuery = applyDateRange(
      baseQuery,
      "createdAt",
      assignedAtFrom,
      assignedAtTo,
      false,
    );
    baseQuery = applyDateRange(
      baseQuery,
      "departed",
      departedAtFrom,
      departedAtTo,
      true,
    );
    baseQuery = applyDateRange(
      baseQuery,
      "destDeparture",
      completedAtFrom,
      completedAtTo,
      true,
    );

    const sortOptions = { oldest: { createdAt: 1 }, latest: { createdAt: -1 } };
    baseQuery = baseQuery.sort(sortOptions[sort] || sortOptions.latest);

    const limit = parseInt(perPage);
    const skip = (parseInt(page) - 1) * limit;
    baseQuery = baseQuery.skip(skip).limit(limit);

    baseQuery = baseQuery.populate([
      {
        path: "truckId",
        select: "plateNo truckType condition status imageUrl subcon",
      },
      {
        path: "driverId",
        select: "firstname lastname licenseNo contact subcon",
      },
      {
        path: "replacement.replacementTruckId",
        select: "plateNo truckType condition status imageUrl subcon",
      },
      {
        path: "replacement.replacementDriverId",
        select: "firstname lastname licenseNo contact subcon",
      },
      {
        path: "pickups",
      },
    ]);

    let deployments = await baseQuery;

    if (subconFilter) {
      deployments = deployments.filter(
        (d) => getActiveSubcon(d).toLowerCase() === subconFilter,
      );
    }

    if (search && search !== "") {
      const s = search.toLowerCase();
      deployments = deployments.filter((deployment) => {
        const plate = (
          deployment.replacement?.replacementTruckId?.plateNo ||
          deployment.truckId?.plateNo ||
          ""
        ).toLowerCase();
        const firstName = (
          deployment.replacement?.replacementDriverId?.firstname ||
          deployment.driverId?.firstname ||
          ""
        ).toLowerCase();
        const lastName = (
          deployment.replacement?.replacementDriverId?.lastname ||
          deployment.driverId?.lastname ||
          ""
        ).toLowerCase();

        const matchesPickup = (deployment.pickups || []).some((p) =>
          [p.tmoNo, p.pickupSite, p.municipality, p.fieldContactPerson]
            .map((v) => (v || "").toLowerCase())
            .some((v) => v.includes(s)),
        );

        const matchesContact = (deployment.receivingContacts || []).some((c) =>
          (c.contactPerson || "").toLowerCase().includes(s),
        );

        return (
          plate.includes(s) ||
          firstName.includes(s) ||
          lastName.includes(s) ||
          (deployment.destination || "").toLowerCase().includes(s) ||
          (deployment.truckType || "").toLowerCase().includes(s) ||
          (deployment.deploymentCode || "").toLowerCase().includes(s) ||
          getActiveSubcon(deployment).toLowerCase().includes(s) ||
          matchesPickup ||
          matchesContact
        );
      });
    }

    const buildCountQuery = () => {
      let q = Deployment.find();
      if (includeDeleted !== "true") q = q.where("isSoftDeleted").ne(true);
      if (status && status !== "") q = q.where("status").equals(status);
      q = applyDateRange(q, "createdAt", assignedAtFrom, assignedAtTo, false);
      q = applyDateRange(q, "departed", departedAtFrom, departedAtTo, true);
      q = applyDateRange(
        q,
        "destDeparture",
        completedAtFrom,
        completedAtTo,
        true,
      );
      return q;
    };

    let total;

    if (subconFilter || (search && search !== "")) {
      const allForCount = await buildCountQuery().populate([
        { path: "truckId", select: "subcon plateNo" },
        { path: "replacement.replacementTruckId", select: "subcon plateNo" },
        {
          path: "replacement.replacementDriverId",
          select: "firstname lastname",
        },
        {
          path: "pickups",
          select: "tmoNo pickupSite municipality fieldContactPerson",
        },
      ]);

      let filtered = allForCount;

      if (subconFilter) {
        filtered = filtered.filter(
          (d) => getActiveSubcon(d).toLowerCase() === subconFilter,
        );
      }

      if (search && search !== "") {
        const s = search.toLowerCase();
        filtered = filtered.filter((deployment) => {
          const plate = (
            deployment.replacement?.replacementTruckId?.plateNo ||
            deployment.truckId?.plateNo ||
            ""
          ).toLowerCase();

          const matchesPickup = (deployment.pickups || []).some((p) =>
            [p.tmoNo, p.pickupSite, p.municipality, p.fieldContactPerson]
              .map((v) => (v || "").toLowerCase())
              .some((v) => v.includes(s)),
          );

          const matchesContact = (deployment.receivingContacts || []).some(
            (c) => (c.contactPerson || "").toLowerCase().includes(s),
          );

          return (
            plate.includes(s) ||
            (deployment.destination || "").toLowerCase().includes(s) ||
            (deployment.truckType || "").toLowerCase().includes(s) ||
            (deployment.deploymentCode || "").toLowerCase().includes(s) ||
            getActiveSubcon(deployment).toLowerCase().includes(s) ||
            matchesPickup ||
            matchesContact
          );
        });
      }

      total = filtered.length;
    } else {
      total = await buildCountQuery().countDocuments();
    }

    return res.status(200).json({
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      deployments,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Update deployment ─────────────────────────────────────────────────────────

const updateDeployment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      pickups,
      pickupUpdates,
      truckId,
      driverId,
      truckType,
      helperCount,
      destination,
      receivingContacts,
      replacement,
      departed,
      destArrival,
      destDeparture,
      status,
      cancellationReason,
      isTMOPrinted,
    } = req.body;

    if (!["head_admin", "admin"].includes(req.user.role)) {
      return next(createError(403, "Access denied"));
    }

    if (
      status === "canceled" &&
      (!cancellationReason || cancellationReason.trim() === "")
    ) {
      return next(
        createError(
          400,
          "Cancellation reason is required when canceling a deployment",
        ),
      );
    }

    const existingDeployment = await Deployment.findOne({
      _id: id,
      isSoftDeleted: { $ne: true },
    }).populate("pickups");

    if (!existingDeployment)
      return next(createError(404, "Deployment not found"));

    // if (departed !== undefined && departed !== null && departed.trim() !== "") {
    //   const currentIsTMOPrinted =
    //     isTMOPrinted !== undefined
    //       ? isTMOPrinted
    //       : existingDeployment.isTMOPrinted;
    //   if (!currentIsTMOPrinted) {
    //     return next(
    //       createError(
    //         400,
    //         "TMO must be exported/printed before updating departure time",
    //       ),
    //     );
    //   }
    // }

    const deploymentCode = existingDeployment.deploymentCode;
    const extractedTruckId = truckId?._id || truckId;
    const extractedDriverId = driverId?._id || driverId;

    const originalValues = {
      pickups: existingDeployment.pickups,
      truckId: existingDeployment.truckId?.toString(),
      driverId: existingDeployment.driverId?.toString(),
      truckType: existingDeployment.truckType,
      helperCount: existingDeployment.helperCount,
      destination: existingDeployment.destination,
      receivingContacts: existingDeployment.receivingContacts,
      totalSacksCount: existingDeployment.totalSacksCount,
      totalWeightKg: existingDeployment.totalWeightKg,
      departed: existingDeployment.departed,
      destArrival: existingDeployment.destArrival,
      destDeparture: existingDeployment.destDeparture,
      status: existingDeployment.status,
      cancellationReason: existingDeployment.cancellationReason,
      isTMOPrinted: existingDeployment.isTMOPrinted,
      replacementTruckId:
        existingDeployment.replacement?.replacementTruckId?.toString(),
      replacementDriverId:
        existingDeployment.replacement?.replacementDriverId?.toString(),
    };

    const originalStatus = existingDeployment.status;
    const hasExistingReplacement =
      existingDeployment.replacement?.replacementTruckId;
    const hasExistingDriverReplacement =
      existingDeployment.replacement?.replacementDriverId;

    let performedReplacement = false;
    let performedDriverReplacement = false;
    let replacementTruckDetails = null;
    let replacementDriverDetails = null;

    const createReplacementTimelineLog = async (action, timestamp) => {
      // toManilaDate ensures bare strings like "14:30" are parsed as Manila time,
      // not the live server's system timezone (UTC)
      const ts = timestamp
        ? toManilaDate(timestamp)
        : DateTime.now().setZone(MANILA_TZ).toJSDate();
      await TimelineLog.create({
        performedBy: req.user._id,
        action,
        status: existingDeployment.status,
        timestamp: ts,
        targetDeployment: existingDeployment._id,
      });
    };

    // ── Truck replacement ─────────────────────────────────────────────────
    if (replacement?.replacementTruckId) {
      const replacementTruckId =
        replacement.replacementTruckId._id || replacement.replacementTruckId;
      const isNewReplacement =
        !hasExistingReplacement ||
        hasExistingReplacement.toString() !== replacementTruckId.toString();

      if (isNewReplacement) {
        performedReplacement = true;

        const [newTruck, oldTruck, oldReplacementTruck] = await Promise.all([
          Truck.findById(replacementTruckId),
          Truck.findById(existingDeployment.truckId),
          hasExistingReplacement
            ? Truck.findById(existingDeployment.replacement.replacementTruckId)
            : Promise.resolve(null),
        ]);

        const oldPlateNo = (oldTruck?.plateNo || "Unknown").toUpperCase();
        const newPlateNo = (newTruck?.plateNo || "Unknown").toUpperCase();
        const oldReplacementPlateNo = (
          oldReplacementTruck?.plateNo || "Unknown"
        ).toUpperCase();

        replacementTruckDetails = {
          oldPlateNo,
          newPlateNo,
          oldReplacementPlateNo,
          newTruck,
          oldTruck,
          oldReplacementTruck,
        };

        const updatePromises = [
          Truck.findByIdAndUpdate(replacementTruckId, { status: "deployed" }),
        ];
        if (hasExistingReplacement && oldReplacementTruck) {
          updatePromises.push(
            Truck.findByIdAndUpdate(
              existingDeployment.replacement.replacementTruckId,
              { status: "available" },
            ),
          );
        }
        if (!hasExistingReplacement) {
          updatePromises.push(
            Truck.findByIdAndUpdate(existingDeployment.truckId, {
              status: "available",
            }),
          );
        }
        await Promise.all(updatePromises);

        await createReplacementTimelineLog(
          hasExistingReplacement
            ? `Truck ${oldReplacementPlateNo} has been replaced to ${newPlateNo}`
            : `Truck ${oldPlateNo} has been replaced to ${newPlateNo}`,
          replacement?.replacedAt || new Date(),
        );
      }

      existingDeployment.replacement = {
        replacementTruckId,
        replacementDriverId:
          replacement.replacementDriverId?._id ||
          replacement.replacementDriverId ||
          existingDeployment.replacement?.replacementDriverId,
        replacementTruckType:
          replacement.replacementTruckType ||
          existingDeployment.replacement?.replacementTruckType ||
          existingDeployment.truckType,
        replacementHelperCount:
          replacement.replacementHelperCount !== undefined
            ? Number(replacement.replacementHelperCount)
            : existingDeployment.replacement?.replacementHelperCount !==
                undefined
              ? existingDeployment.replacement.replacementHelperCount
              : Number(existingDeployment.helperCount),
        replacedAt: replacement.replacedAt || new Date().toISOString(),
        reason: replacement.reason,
        remarks: replacement.remarks,
      };
    }

    // ── Driver replacement ────────────────────────────────────────────────
    if (replacement?.replacementDriverId) {
      const replacementDriverId =
        replacement.replacementDriverId._id || replacement.replacementDriverId;
      const isNewDriverReplacement =
        !hasExistingDriverReplacement ||
        hasExistingDriverReplacement.toString() !==
          replacementDriverId.toString();

      if (isNewDriverReplacement) {
        performedDriverReplacement = true;

        const [newDriver, oldDriver, oldReplacementDriver] = await Promise.all([
          Driver.findById(replacementDriverId),
          existingDeployment.driverId
            ? Driver.findById(existingDeployment.driverId)
            : null,
          hasExistingDriverReplacement
            ? Driver.findById(
                existingDeployment.replacement.replacementDriverId,
              )
            : Promise.resolve(null),
        ]);

        replacementDriverDetails = {
          oldDriverName: oldDriver
            ? `${oldDriver.firstname} ${oldDriver.lastname}`
            : "Unknown",
          newDriverName: newDriver
            ? `${newDriver.firstname} ${newDriver.lastname}`
            : "Unknown",
          oldReplacementDriverName: oldReplacementDriver
            ? `${oldReplacementDriver.firstname} ${oldReplacementDriver.lastname}`
            : "Unknown",
          newDriver,
          oldDriver,
          oldReplacementDriver,
        };

        const updatePromises = [
          Driver.findByIdAndUpdate(replacementDriverId, { status: "deployed" }),
        ];
        if (hasExistingDriverReplacement && oldReplacementDriver) {
          updatePromises.push(
            Driver.findByIdAndUpdate(
              existingDeployment.replacement.replacementDriverId,
              { status: "available" },
            ),
          );
        }
        if (!hasExistingDriverReplacement) {
          updatePromises.push(
            Driver.findByIdAndUpdate(existingDeployment.driverId, {
              status: "available",
            }),
          );
        }
        await Promise.all(updatePromises);

        await createReplacementTimelineLog(
          hasExistingDriverReplacement
            ? `Driver ${replacementDriverDetails.oldReplacementDriverName} has been replaced to ${replacementDriverDetails.newDriverName}`
            : `Driver ${replacementDriverDetails.oldDriverName} has been replaced to ${replacementDriverDetails.newDriverName}`,
          replacement?.replacedAt || new Date(),
        );
      }

      if (existingDeployment.replacement) {
        existingDeployment.replacement.replacementDriverId =
          replacementDriverId;
        if (replacement.replacedAt)
          existingDeployment.replacement.replacedAt = replacement.replacedAt;
        if (replacement.reason)
          existingDeployment.replacement.reason = replacement.reason;
        if (replacement.remarks)
          existingDeployment.replacement.remarks = replacement.remarks;
      } else {
        existingDeployment.replacement = {
          replacementTruckId: existingDeployment.truckId,
          replacementDriverId,
          replacementTruckType: existingDeployment.truckType,
          replacementHelperCount: Number(existingDeployment.helperCount),
          replacedAt: replacement.replacedAt || new Date().toISOString(),
          reason: replacement.reason,
          remarks: replacement.remarks,
        };
      }
    }

    // ── Regular truck/driver change (non-replacement) ─────────────────────
    if (
      extractedTruckId &&
      extractedTruckId.toString() !== originalValues.truckId &&
      !performedReplacement
    ) {
      const [newTruck, oldTruck] = await Promise.all([
        Truck.findById(extractedTruckId),
        Truck.findById(originalValues.truckId),
      ]);
      if (newTruck) {
        await createReplacementTimelineLog(
          `Truck ${(
            oldTruck?.plateNo || "Unknown"
          ).toUpperCase()} has been changed to ${newTruck.plateNo.toUpperCase()}`,
        );
      }
    }

    if (
      extractedDriverId &&
      extractedDriverId.toString() !== originalValues.driverId &&
      !performedDriverReplacement
    ) {
      const [newDriver, oldDriver] = await Promise.all([
        Driver.findById(extractedDriverId),
        Driver.findById(originalValues.driverId),
      ]);
      if (newDriver) {
        const oldName = oldDriver
          ? `${oldDriver.firstname} ${oldDriver.lastname}`
          : "Unknown";
        await createReplacementTimelineLog(
          `Driver ${oldName} has been changed to ${newDriver.firstname} ${newDriver.lastname}`,
        );
      }
    }

    // ── Determine final status ────────────────────────────────────────────
    const isDepartedSet =
      departed !== undefined && departed !== "" && departed !== null;
    const isDestDepartureSet =
      destDeparture !== undefined &&
      destDeparture !== "" &&
      destDeparture !== null;

    let finalStatus = status || existingDeployment.status;
    if (isDepartedSet && !isDestDepartureSet && finalStatus !== "canceled")
      finalStatus = "ongoing";
    else if (isDestDepartureSet && finalStatus !== "canceled")
      finalStatus = "completed";

    // ── Cancellation reason ───────────────────────────────────────────────
    let finalCancellationReason = existingDeployment.cancellationReason;
    if (originalStatus === "canceled" && finalStatus !== "canceled")
      finalCancellationReason = undefined;
    if (finalStatus === "canceled" && originalStatus !== "canceled")
      finalCancellationReason = cancellationReason;
    if (
      originalStatus === "canceled" &&
      finalStatus === "canceled" &&
      cancellationReason !== undefined
    ) {
      finalCancellationReason = cancellationReason;
    }

    // ── Active IDs after replacement processing ───────────────────────────
    const currentActiveTruckId = performedReplacement
      ? replacement?.replacementTruckId?._id ||
        replacement?.replacementTruckId ||
        existingDeployment.truckId
      : hasExistingReplacement
        ? existingDeployment.replacement.replacementTruckId
        : existingDeployment.truckId;

    const currentActiveDriverId = performedDriverReplacement
      ? replacement?.replacementDriverId?._id ||
        replacement?.replacementDriverId ||
        existingDeployment.driverId
      : hasExistingDriverReplacement
        ? existingDeployment.replacement.replacementDriverId
        : existingDeployment.driverId;

    // ── Status-based truck/driver availability ────────────────────────────
    const statusUpdates = [];
    if (
      finalStatus === "canceled" ||
      (isDestDepartureSet && finalStatus === "completed")
    ) {
      if (currentActiveTruckId)
        statusUpdates.push(
          Truck.findByIdAndUpdate(currentActiveTruckId, {
            status: "available",
          }),
        );
      if (currentActiveDriverId)
        statusUpdates.push(
          Driver.findByIdAndUpdate(currentActiveDriverId, {
            status: "available",
          }),
        );
    } else if (finalStatus === "ongoing" || finalStatus === "preparing") {
      if (
        currentActiveTruckId &&
        !performedReplacement &&
        (!hasExistingReplacement ||
          currentActiveTruckId.toString() !== originalValues.truckId)
      ) {
        statusUpdates.push(
          Truck.findByIdAndUpdate(currentActiveTruckId, { status: "deployed" }),
        );
      }
      if (
        currentActiveDriverId &&
        !performedDriverReplacement &&
        (!hasExistingDriverReplacement ||
          currentActiveDriverId.toString() !== originalValues.driverId)
      ) {
        statusUpdates.push(
          Driver.findByIdAndUpdate(currentActiveDriverId, {
            status: "deployed",
          }),
        );
      }
    }
    await Promise.all(statusUpdates);

    // ── Truck/driver swap (non-replacement) ───────────────────────────────
    if (
      extractedTruckId &&
      extractedTruckId.toString() !== originalValues.truckId &&
      !hasExistingReplacement &&
      !performedReplacement
    ) {
      const updates = [];
      if (originalValues.truckId)
        updates.push(
          Truck.findByIdAndUpdate(originalValues.truckId, {
            status: "available",
          }),
        );
      if (finalStatus !== "canceled" && finalStatus !== "completed") {
        updates.push(
          Truck.findByIdAndUpdate(extractedTruckId, { status: "deployed" }),
        );
      }
      await Promise.all(updates);
    }

    if (
      extractedDriverId &&
      extractedDriverId.toString() !== originalValues.driverId &&
      !hasExistingDriverReplacement &&
      !performedDriverReplacement
    ) {
      const updates = [];
      if (originalValues.driverId)
        updates.push(
          Driver.findByIdAndUpdate(originalValues.driverId, {
            status: "available",
          }),
        );
      if (finalStatus !== "canceled" && finalStatus !== "completed") {
        updates.push(
          Driver.findByIdAndUpdate(extractedDriverId, { status: "deployed" }),
        );
      }
      await Promise.all(updates);
    }

    // ── Trip count on completion ──────────────────────────────────────────
    if (finalStatus === "completed" && originalStatus !== "completed") {
      try {
        await Promise.all(
          [
            currentActiveDriverId &&
              Driver.findByIdAndUpdate(currentActiveDriverId, {
                $inc: { tripCount: 1 },
              }),
            currentActiveTruckId &&
              Truck.findByIdAndUpdate(currentActiveTruckId, {
                $inc: { tripCount: 1 },
              }),
          ].filter(Boolean),
        );
      } catch (err) {
        console.error("Error incrementing trip counts:", err);
      }
    }

    // ── Pickups ───────────────────────────────────────────────────────────
    if (pickups !== undefined) {
      // pickups is an array of PickupField ObjectIds
      const oldIds = (originalValues.pickups || []).map((p) =>
        p._id?.toString(),
      );
      const newIds = (pickups || []).map((id) => id.toString());

      const removedIds = oldIds.filter((id) => !newIds.includes(id));
      const addedIds = newIds.filter((id) => !oldIds.includes(id));

      if (removedIds.length > 0) {
        await releasePickupFields({ fieldIds: removedIds });
      }

      if (addedIds.length > 0) {
        const monthKey = getMonthKey();
        await Promise.all(
          addedIds.map(async (fieldId) => {
            const tmoNo = await generateCode("TMO", monthKey, "tmo");
            return PickupField.findByIdAndUpdate(fieldId, {
              status: "ongoing",
              deploymentId: existingDeployment._id,
              tmoNo,
            });
          }),
        );
      }

      existingDeployment.pickups = newIds;
      existingDeployment.markModified("pickups");
    }

    if (pickupUpdates && Array.isArray(pickupUpdates)) {
      // Updates are keyed by PickupField _id — write directly to PickupField docs
      await Promise.all(
        pickupUpdates
          .map((update) => {
            if (!update.id) return null;
            const updateData = {};
            if (update.pickupIn !== undefined)
              updateData.pickupIn = update.pickupIn;
            if (update.pickupOut !== undefined)
              updateData.pickupOut = update.pickupOut;
            if (update.fieldWeightKg !== undefined)
              updateData.fieldWeightKg = update.fieldWeightKg;
            if (update.plantWeightKg !== undefined)
              updateData.plantWeightKg = update.plantWeightKg;
            if (update.sacksCount !== undefined)
              updateData.sacksCount = Number(update.sacksCount);
            if (Object.keys(updateData).length === 0) return null;
            return PickupField.findByIdAndUpdate(update.id, updateData);
          })
          .filter(Boolean),
      );
    }

    // Re-fetch updated PickupField docs to compute accurate totals
    const updatedPickupDocs = await PickupField.find({
      _id: { $in: existingDeployment.pickups },
    });
    const computedSacksCount = updatedPickupDocs.reduce(
      (sum, p) => sum + (Number(p.sacksCount) || 0),
      0,
    );
    const computedWeightKg = updatedPickupDocs.reduce(
      (sum, p) => sum + (parseFloat(p.plantWeightKg) || 0),
      0,
    );

    Object.assign(existingDeployment, {
      truckId: extractedTruckId || existingDeployment.truckId,
      driverId: extractedDriverId || existingDeployment.driverId,
      truckType:
        truckType !== undefined ? truckType : existingDeployment.truckType,
      helperCount:
        helperCount !== undefined
          ? helperCount
          : existingDeployment.helperCount,
      destination:
        destination !== undefined
          ? destination
          : existingDeployment.destination,
      receivingContacts:
        receivingContacts !== undefined
          ? receivingContacts
          : existingDeployment.receivingContacts,
      totalSacksCount: computedSacksCount,
      totalWeightKg: computedWeightKg,
      departed: departed !== undefined ? departed : existingDeployment.departed,
      destArrival:
        destArrival !== undefined
          ? destArrival
          : existingDeployment.destArrival,
      destDeparture:
        destDeparture !== undefined
          ? destDeparture
          : existingDeployment.destDeparture,
      status:
        finalStatus !== undefined ? finalStatus : existingDeployment.status,
      cancellationReason: finalCancellationReason,
      isTMOPrinted:
        isTMOPrinted !== undefined
          ? isTMOPrinted
          : existingDeployment.isTMOPrinted,
    });

    await existingDeployment.save();

    // ── Timeline & activity logs ──────────────────────────────────────────
    const timelineLogs = [];
    const activityLogs = [];
    const now = DateTime.now().setZone(MANILA_TZ).toISO();

    const createOrUpdateTimelineLog = async (
      actionType,
      rawTimestamp,
      logStatus,
    ) => {
      // Parse as Manila time so live server (UTC) stores the correct UTC instant
      const newTimestamp = toManilaDate(rawTimestamp);
      const actionMap = {
        departed: "Departed from station",
        destArrival: "Arrived at destination",
        destDeparture: "Departed from destination",
        canceled: "Deployment has been canceled",
      };
      const action = actionMap[actionType];
      if (!action) return;

      const existingLog = await TimelineLog.findOne({
        targetDeployment: existingDeployment._id,
        action: { $regex: `^${action}` },
      }).sort({ timestamp: -1 });

      if (existingLog) {
        existingLog.timestamp = newTimestamp;
        existingLog.status = logStatus;
        await existingLog.save();
        timelineLogs.push(`${action} (updated)`);
      } else {
        await TimelineLog.create({
          performedBy: req.user._id,
          action,
          status: logStatus,
          timestamp: newTimestamp,
          targetDeployment: existingDeployment._id,
        });
        timelineLogs.push(action);
      }
    };

    const createActivityLog = async (action) => {
      await ActivityLog.create({
        type: "deployment",
        performedBy: req.user._id,
        action: `${deploymentCode}: ${action}`,
        targetDeployment: existingDeployment._id,
      });
      activityLogs.push(action);
    };

    // ── Pickup timeline logs ──────────────────────────────────────────────
    // Stop label is only shown when there are 2 or more pickups
    if (pickups !== undefined && finalStatus !== "canceled") {
      const isMultiStop = pickups.length >= 2;

      for (let i = 0; i < pickups.length; i++) {
        const p = pickups[i];
        const originalStop = p.tmoNo
          ? originalValues.pickups?.find((op) => op.tmoNo === p.tmoNo)
          : originalValues.pickups?.[i];

        const stopLabel = isMultiStop
          ? p.tmoNo
            ? `Stop #${i + 1} (${p.tmoNo})`
            : `Stop #${i + 1}`
          : null;

        if (p.pickupIn && !originalStop?.pickupIn) {
          await TimelineLog.create({
            performedBy: req.user._id,
            action: `Arrived at pickup location${
              stopLabel ? ` (${stopLabel})` : ""
            }`,
            status: finalStatus || "ongoing",
            timestamp: toManilaDate(p.pickupIn),
            targetDeployment: existingDeployment._id,
          });
          timelineLogs.push(`pickupIn${stopLabel ? ` ${stopLabel}` : ""}`);
          await createActivityLog(
            `Arrived at pickup location${stopLabel ? ` (${stopLabel})` : ""}`,
          );
        }

        if (p.pickupOut && !originalStop?.pickupOut) {
          await TimelineLog.create({
            performedBy: req.user._id,
            action: `Departed from pickup location${
              stopLabel ? ` (${stopLabel})` : ""
            }`,
            status: finalStatus || "ongoing",
            timestamp: toManilaDate(p.pickupOut),
            targetDeployment: existingDeployment._id,
          });
          timelineLogs.push(`pickupOut${stopLabel ? ` ${stopLabel}` : ""}`);
          await createActivityLog(
            `Departed from pickup location${stopLabel ? ` (${stopLabel})` : ""}`,
          );
        }
      }
    }

    if (pickupUpdates && Array.isArray(pickupUpdates)) {
      const isMultiStop = existingDeployment.pickups.length >= 2;

      for (let i = 0; i < pickupUpdates.length; i++) {
        const update = pickupUpdates[i];
        // originalValues.pickups is populated, find by _id
        const originalStop = (originalValues.pickups || []).find(
          (p) => p._id?.toString() === update.id?.toString(),
        );

        const stopLabel = isMultiStop
          ? originalStop?.tmoNo
            ? `Stop #${i + 1} (${originalStop.tmoNo})`
            : `Stop #${i + 1}`
          : null;

        if (
          update.pickupIn &&
          update.pickupIn !== (originalStop?.pickupIn || "") &&
          !originalStop?.pickupIn
        ) {
          await TimelineLog.create({
            performedBy: req.user._id,
            action: `Arrived at pickup location${
              stopLabel ? ` (${stopLabel})` : ""
            }`,
            status: finalStatus || "ongoing",
            timestamp: toManilaDate(update.pickupIn),
            targetDeployment: existingDeployment._id,
          });
          timelineLogs.push(`pickupIn${stopLabel ? ` ${stopLabel}` : ""}`);
          await createActivityLog(
            `Arrived at pickup location${stopLabel ? ` (${stopLabel})` : ""}`,
          );
        }

        if (
          update.pickupOut &&
          update.pickupOut !== (originalStop?.pickupOut || "") &&
          !originalStop?.pickupOut
        ) {
          await TimelineLog.create({
            performedBy: req.user._id,
            action: `Departed from pickup location${
              stopLabel ? ` (${stopLabel})` : ""
            }`,
            status: finalStatus || "ongoing",
            timestamp: toManilaDate(update.pickupOut),
            targetDeployment: existingDeployment._id,
          });
          timelineLogs.push(`pickupOut${stopLabel ? ` ${stopLabel}` : ""}`);
          await createActivityLog(
            `Departed from pickup location${stopLabel ? ` (${stopLabel})` : ""}`,
          );
        }
      }
    }

    // Cancellation / resume logs
    if (finalStatus === "canceled" && originalStatus !== "canceled") {
      await TimelineLog.create({
        performedBy: req.user._id,
        action: "Deployment has been canceled",
        status: "canceled",
        timestamp: now,
        targetDeployment: existingDeployment._id,
      });
      timelineLogs.push("Deployment has been canceled");
    } else if (finalStatus === "canceled" && originalStatus === "canceled") {
      const latestCancelLog = await TimelineLog.findOne({
        targetDeployment: existingDeployment._id,
        action: "Deployment has been canceled",
        status: "canceled",
      }).sort({ timestamp: -1 });

      let shouldCreateNew = false;
      if (latestCancelLog) {
        const resumedAfter = await TimelineLog.findOne({
          targetDeployment: existingDeployment._id,
          action: /^Deployment resumed as/,
          timestamp: { $gt: latestCancelLog.timestamp },
        });
        if (resumedAfter) shouldCreateNew = true;
      }

      if (shouldCreateNew || !latestCancelLog) {
        await TimelineLog.create({
          performedBy: req.user._id,
          action: "Deployment has been canceled",
          status: "canceled",
          timestamp: now,
          targetDeployment: existingDeployment._id,
        });
        timelineLogs.push("Deployment has been canceled");
      } else {
        latestCancelLog.timestamp = now;
        await latestCancelLog.save();
        timelineLogs.push("Deployment has been canceled (timestamp updated)");
      }
    }

    if (originalStatus === "canceled" && finalStatus !== "canceled") {
      await TimelineLog.create({
        performedBy: req.user._id,
        action: `Deployment resumed as ${finalStatus}`,
        status: finalStatus,
        timestamp: now,
        targetDeployment: existingDeployment._id,
      });
      timelineLogs.push("Deployment resumed");
    }

    if (
      departed !== undefined &&
      departed !== originalValues.departed &&
      departed &&
      !originalValues.departed &&
      finalStatus !== "canceled"
    ) {
      await createOrUpdateTimelineLog(
        "departed",
        departed,
        finalStatus || "ongoing",
      );
      await createActivityLog("Departed from station");
    }

    if (
      destArrival !== undefined &&
      destArrival !== originalValues.destArrival &&
      destArrival &&
      !originalValues.destArrival &&
      finalStatus !== "canceled"
    ) {
      await createOrUpdateTimelineLog(
        "destArrival",
        destArrival,
        finalStatus || "ongoing",
      );
      await createActivityLog("Arrived at destination");
    }

    if (
      destDeparture !== undefined &&
      destDeparture !== originalValues.destDeparture &&
      destDeparture &&
      !originalValues.destDeparture &&
      finalStatus !== "canceled"
    ) {
      await createOrUpdateTimelineLog(
        "destDeparture",
        destDeparture,
        "completed",
      );
      await createActivityLog("Departed from destination");
    }

    if (performedReplacement && replacementTruckDetails) {
      await createActivityLog(
        hasExistingReplacement
          ? `Replacement truck changed from ${replacementTruckDetails.oldReplacementPlateNo} to ${replacementTruckDetails.newPlateNo}`
          : `Truck replaced from ${replacementTruckDetails.oldPlateNo} to ${replacementTruckDetails.newPlateNo}`,
      );
    }

    if (performedDriverReplacement && replacementDriverDetails) {
      await createActivityLog(
        hasExistingDriverReplacement
          ? `Replacement driver changed from ${replacementDriverDetails.oldReplacementDriverName} to ${replacementDriverDetails.newDriverName}`
          : `Driver replaced from ${replacementDriverDetails.oldDriverName} to ${replacementDriverDetails.newDriverName}`,
      );
    }

    if (
      extractedTruckId !== undefined &&
      extractedTruckId.toString() !== originalValues.truckId &&
      !performedReplacement
    ) {
      const newTruck = await Truck.findById(extractedTruckId);
      await createActivityLog(
        `Truck changed to ${(newTruck?.plateNo || "Unknown").toUpperCase()}`,
      );
    }

    if (
      extractedDriverId !== undefined &&
      extractedDriverId.toString() !== originalValues.driverId &&
      !performedDriverReplacement
    ) {
      const newDriver = await Driver.findById(extractedDriverId);
      await createActivityLog(
        `Driver changed to ${
          newDriver ? `${newDriver.firstname} ${newDriver.lastname}` : "Unknown"
        }`,
      );
    }

    if (truckType !== undefined && truckType !== originalValues.truckType)
      await createActivityLog(`Truck type changed to ${truckType}`);
    if (helperCount !== undefined && helperCount !== originalValues.helperCount)
      await createActivityLog(`Helper count changed to ${helperCount}`);
    if (destination !== undefined && destination !== originalValues.destination)
      await createActivityLog(`Destination changed to ${destination}`);

    // Log receiving contacts changes
    if (receivingContacts !== undefined) {
      const oldContacts = originalValues.receivingContacts || [];
      const newContacts = receivingContacts || [];
      const oldPrimary = oldContacts[0];
      const newPrimary = newContacts[0];

      if (newPrimary?.contactPerson !== oldPrimary?.contactPerson)
        await createActivityLog(
          `Receiving contact person changed to ${newPrimary?.contactPerson}`,
        );
      if (newPrimary?.contactPersonNo !== oldPrimary?.contactPersonNo)
        await createActivityLog(`Receiving contact person number changed`);
      if (newContacts.length !== oldContacts.length)
        await createActivityLog(
          `Receiving contacts updated (${newContacts.length} contact${newContacts.length !== 1 ? "s" : ""})`,
        );
    }

    if (computedSacksCount !== originalValues.totalSacksCount)
      await createActivityLog(`Sacks count changed to ${computedSacksCount}`);
    if (computedWeightKg !== originalValues.totalWeightKg)
      await createActivityLog(`Load weight changed to ${computedWeightKg} kg`);
    if (finalStatus !== undefined && finalStatus !== originalStatus)
      await createActivityLog(`Status changed to ${finalStatus}`);

    if (finalCancellationReason !== originalValues.cancellationReason) {
      if (finalStatus === "canceled" && finalCancellationReason)
        await createActivityLog(
          `Cancellation reason: ${finalCancellationReason}`,
        );
      else if (originalStatus === "canceled" && !finalCancellationReason)
        await createActivityLog(`Cancellation reason cleared`);
      else if (finalCancellationReason && originalValues.cancellationReason)
        await createActivityLog(
          `Cancellation reason updated to: ${finalCancellationReason}`,
        );
    }

    if (
      isTMOPrinted !== undefined &&
      isTMOPrinted !== originalValues.isTMOPrinted
    ) {
      await createActivityLog(
        `TMO ${isTMOPrinted ? "exported and printed" : "not exported"}`,
      );
    }

    if (pickups !== undefined) {
      const oldCount = originalValues.pickups?.length || 0;
      const newCount = pickups.length;
      if (newCount > oldCount)
        await createActivityLog(
          `Added ${newCount - oldCount} pickup stop(s) (total: ${newCount})`,
        );
      else if (newCount < oldCount)
        await createActivityLog(
          `Removed ${oldCount - newCount} pickup stop(s) (total: ${newCount})`,
        );
      else await createActivityLog(`Pickup stops updated`);
    }

    // ── Sync pickup fields to completed ───────────────────────────────────
    if (finalStatus === "completed" && originalStatus !== "completed") {
      try {
        await PickupField.updateMany(
          { deploymentId: existingDeployment._id },
          { status: "completed" },
        );
      } catch (err) {
        console.error("Error syncing pickup field statuses to completed:", err);
      }
    }

    // ── Release pickup fields when canceled ───────────────────────────────
    if (finalStatus === "canceled" && originalStatus !== "canceled") {
      await releasePickupFields({
        deploymentId: existingDeployment._id,
        resetOperational: true,
      });
    }

    // ── Re-link pickup fields if a canceled deployment is resumed ─────────
    if (originalStatus === "canceled" && finalStatus !== "canceled") {
      await PickupField.updateMany(
        { _id: { $in: existingDeployment.pickups } },
        { status: "ongoing", deploymentId: existingDeployment._id },
      ).catch((err) =>
        console.error("Error re-linking pickup fields on resume:", err),
      );
    }

    const populatedDeployment = await Deployment.findById(id)
      .populate("truckId")
      .populate("driverId")
      .populate("replacement.replacementTruckId")
      .populate("replacement.replacementDriverId")
      .populate("pickups");

    res.status(200).json({
      message: "Deployment updated successfully",
      deployment: populatedDeployment,
      timelineUpdates: timelineLogs.length > 0 ? timelineLogs : undefined,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Soft delete deployment ────────────────────────────────────────────────────

const softDeleteDeployment = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!["head_admin", "admin"].includes(req.user.role)) {
      return next(createError(403, "Access denied"));
    }

    const deployment = await Deployment.findOne({
      _id: id,
      isSoftDeleted: { $ne: true },
    });
    if (!deployment) return next(createError(404, "Deployment not found"));

    const activeTruckId =
      deployment.replacement?.replacementTruckId || deployment.truckId;
    const activeDriverId =
      deployment.replacement?.replacementDriverId || deployment.driverId;

    await Promise.all(
      [
        activeTruckId &&
          Truck.findByIdAndUpdate(activeTruckId, { status: "available" }),
        activeDriverId &&
          Driver.findByIdAndUpdate(activeDriverId, { status: "available" }),
      ].filter(Boolean),
    );

    const deploymentCode = deployment.deploymentCode;
    let timelineLogsDeleted = 0;

    try {
      const result = await TimelineLog.deleteMany({
        targetDeployment: deployment._id,
      });
      timelineLogsDeleted = result.deletedCount;
    } catch (err) {
      console.error(`Error deleting timeline logs for ${deploymentCode}:`, err);
    }

    deployment.isSoftDeleted = true;
    await deployment.save();

    // Release linked pickup fields and wipe all operational data collected
    // during this deployment (fieldWeightKg, plantWeightKg, sacksCount, pickupIn, pickupOut)
    await releasePickupFields({
      deploymentId: deployment._id,
      resetOperational: true,
    });

    await ActivityLog.create({
      type: "deployment",
      performedBy: req.user._id,
      action: `${deploymentCode}: Deployment deleted (${timelineLogsDeleted} timeline logs removed)`,
      targetDeployment: deployment._id,
    });

    res.status(200).json({
      message: "Deployment deleted successfully",
      deploymentCode,
      timelineLogsDeleted,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createDeployment,
  getAllDeployments,
  updateDeployment,
  softDeleteDeployment,
};
