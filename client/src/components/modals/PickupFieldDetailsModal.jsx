import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  TransitionChild,
} from "@headlessui/react";
import { IoClose } from "react-icons/io5";
import { TbMapPinFilled, TbPencilMinus, TbTrash } from "react-icons/tb";
import { FaSave } from "react-icons/fa";
import { MdKeyboardArrowDown } from "react-icons/md";
import { NumericFormat } from "react-number-format";
import { toast } from "react-toastify";
import clsx from "clsx";
import { DateTime } from "luxon";
import useUpdatePickupField from "../../hooks/useUpdatePickupField";
import { useSettingsContext } from "../../contexts/SettingsContext";

const STATUS_CONFIG = {
  not_done: {
    label: "Not Done",
    style: "bg-gray-100 text-gray-600 border-gray-200",
  },
  ongoing: {
    label: "Ongoing",
    style: "bg-orange-50 text-orange-500 border-orange-100",
  },
  completed: {
    label: "Completed",
    style: "bg-emerald-50 text-emerald-600 border-emerald-100",
  },
};

const toForm = (f) => ({
  pickupSite: f?.pickupSite ?? "",
  municipality: f?.municipality ?? "",
  fieldContactPerson: f?.fieldContactPerson ?? "",
  fieldContactPersonNo: f?.fieldContactPersonNo ?? "",
  scheduledPickupTime: f?.scheduledPickupTime ?? "",
  estimatedWeightKg: f?.estimatedWeightKg ?? "",
  hybrid: f?.hybrid ?? "",
  territory: f?.territory ?? "",
  flagging: f?.flagging ?? "",
  flaggingRemarks: f?.flaggingRemarks ?? "",
  fieldWeightKg: f?.fieldWeightKg ?? "",
  plantWeightKg: f?.plantWeightKg ?? "",
  sacksCount: f?.sacksCount ?? "",
  pickupIn: f?.pickupIn ?? "",
  pickupOut: f?.pickupOut ?? "",
});

/* ── SelectField ── */
const SelectField = ({
  label,
  name,
  value,
  onChange,
  options = [],
  isRequired = false,
  disabled = false,
}) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-xxs sm:text-xs font-semibold text-gray-600 uppercase tracking-wider">
      {label} {isRequired && <span className="text-red-400">*</span>}
    </span>
    <div
      className={clsx(
        "relative group flex items-center bg-white border border-gray-200 rounded-xl px-4 py-3 max-sm:px-3 max-sm:py-2.5",
        "focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20 transition-all duration-200 shadow-sm",
        disabled && "opacity-60 cursor-not-allowed",
      )}
    >
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={isRequired}
        disabled={disabled}
        className="w-full appearance-none bg-transparent text-sm max-sm:text-xs text-gray-800 focus:outline-none capitalize disabled:cursor-not-allowed"
      >
        <option value="">—</option>
        {options.map((item, index) => (
          <option key={index} value={item}>
            {item}
          </option>
        ))}
      </select>
      <MdKeyboardArrowDown className="absolute right-4 max-sm:right-3 text-gray-400 group-focus-within:text-primaryColor text-lg pointer-events-none transition-colors" />
    </div>
  </div>
);

/* ── NumericField ── */
const NumericField = ({
  label,
  value,
  onValueChange,
  placeholder = "",
  isRequired = false,
  disabled = false,
  thousandSeparator = true,
  decimalScale = 2,
}) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-xxs sm:text-xs font-semibold text-gray-600 uppercase tracking-wider">
      {label} {isRequired && <span className="text-red-400">*</span>}
    </span>
    <div
      className={clsx(
        "flex items-center bg-white border border-gray-200 rounded-xl px-4 py-3 max-sm:px-3 max-sm:py-2.5",
        "focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20 transition-all duration-200 shadow-sm",
        disabled && "opacity-60 cursor-not-allowed",
      )}
    >
      <NumericFormat
        thousandSeparator={thousandSeparator}
        decimalScale={decimalScale}
        allowNegative={false}
        value={value}
        onValueChange={onValueChange}
        placeholder={placeholder}
        required={isRequired}
        disabled={disabled}
        className="flex-1 text-sm max-sm:text-xs text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none w-full"
      />
    </div>
  </div>
);

/* ── InputField ── */
const InputField = ({
  label,
  type = "text",
  name,
  value,
  onChange,
  placeholder = "",
  maxLength = 50,
  isRequired = true,
  disabled = false,
}) => (
  <label className="flex flex-col gap-1.5">
    <span className="text-xxs sm:text-xs font-semibold text-gray-600 uppercase tracking-wider">
      {label} {isRequired && <span className="text-red-400">*</span>}
    </span>
    <div
      className={clsx(
        "flex items-center bg-white border border-gray-200 rounded-xl px-4 py-3 max-sm:px-3 max-sm:py-2.5 overflow-hidden",
        "focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20",
        "transition-all duration-200 shadow-sm",
        disabled && "opacity-60 cursor-not-allowed",
      )}
    >
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={isRequired}
        placeholder={placeholder}
        maxLength={maxLength}
        className={clsx(
          "flex-1 min-w-0 text-sm max-sm:text-xs text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none",
          type !== "datetime-local" && "capitalize",
        )}
      />
    </div>
  </label>
);

function PickupFieldDetailsModal({
  isOpen,
  onClose,
  field,
  onUpdate,
  onOpenDelete,
}) {
  const { settings } = useSettingsContext();
  const { updatePickupFieldFunction, isLoading } = useUpdatePickupField();

  const [isEditMode, setIsEditMode] = useState(false);
  // ✅ Fix: initialize with toForm(null) so all keys are "" instead of undefined
  const [editForm, setEditForm] = useState(toForm(null));

  useEffect(() => {
    if (isOpen && field) {
      setEditForm(toForm(field));
      setIsEditMode(false);
    }
  }, [isOpen, field]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditForm(toForm(field));
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const { data: fieldResult, error: fieldError } =
      await updatePickupFieldFunction(field._id, editForm);
    if (fieldError) {
      toast.error(fieldError);
      return;
    }

    toast.success(
      hasLinked
        ? `Saved and synced to deployment ${deploymentCode}.`
        : "Pickup field updated successfully!",
    );
    onUpdate(fieldResult.pickupField);
    setIsEditMode(false);
    onClose();
  };

  const statusCfg = STATUS_CONFIG[field?.status] ?? STATUS_CONFIG.not_done;
  const hasLinked = !!field?.deploymentId;
  const deploymentCode = field?.deploymentId?.deploymentCode ?? null;
  const tmoNo = field?.tmoNo ?? null;
  const canEdit = isEditMode && !isLoading;

  return (
    <Dialog
      open={isOpen}
      onClose={isLoading ? () => {} : onClose}
      className="relative z-50"
    >
      <TransitionChild
        enter="ease-out duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="ease-in duration-200"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <DialogBackdrop className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      </TransitionChild>

      <div className="fixed inset-0 flex items-center justify-center p-4 max-sm:p-2">
        <TransitionChild
          enter="ease-out duration-300"
          enterFrom="opacity-0 scale-95 translate-y-2"
          enterTo="opacity-100 scale-100 translate-y-0"
          leave="ease-in duration-200"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <DialogPanel className="font-poppins text-gray-900 w-full max-w-3xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col lg:flex-row max-h-[90vh] lg:max-h-[75vh]">
            <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
              {/* Header */}
              <div className="flex items-start justify-between px-6 pt-5 pb-4 max-sm:px-4 max-sm:pt-4 max-sm:pb-3 border-b border-gray-100 shrink-0">
                <div>
                  <h2 className="text-gray-900 font-bold text-lg max-sm:text-base">
                    Pickup Field Details
                  </h2>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {isEditMode
                      ? hasLinked
                        ? "Editing will also update stop in linked deployment."
                        : "Make changes and save to update."
                      : "View this pickup field's information."}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg text-xl transition-all cursor-pointer disabled:opacity-40 shrink-0 ml-4"
                >
                  <IoClose />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
                <form id="pickup-field-details-form" onSubmit={handleSave}>
                  <div className="flex flex-col gap-5 px-6 pt-4 pb-6 max-sm:px-4">
                    {/* ── Field Info ── */}
                    <div className="space-y-2">
                      <p className="text-xxs sm:text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Field Info
                      </p>
                      <div className="border border-gray-200 rounded-xl p-4 max-sm:p-3 bg-gray-50/50">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                          <InputField
                            label="Pick-up Site"
                            name="pickupSite"
                            value={editForm.pickupSite}
                            onChange={handleChange}
                            placeholder="Pick-up Site"
                            disabled={!canEdit}
                          />
                          <InputField
                            label="Municipality"
                            name="municipality"
                            value={editForm.municipality}
                            onChange={handleChange}
                            placeholder="Municipality"
                            disabled={!canEdit}
                          />
                          <InputField
                            label="Scheduled Pickup Time"
                            type="datetime-local"
                            name="scheduledPickupTime"
                            value={editForm.scheduledPickupTime}
                            onChange={handleChange}
                            isRequired={false}
                            disabled={!canEdit}
                          />
                          <InputField
                            label="Field Contact Person"
                            name="fieldContactPerson"
                            value={editForm.fieldContactPerson}
                            onChange={handleChange}
                            placeholder="Field Contact Person"
                            disabled={!canEdit}
                            isRequired={false}
                          />
                          <InputField
                            label="Field Contact No."
                            name="fieldContactPersonNo"
                            type="tel"
                            value={editForm.fieldContactPersonNo}
                            onChange={handleChange}
                            placeholder="Contact Number"
                            maxLength={11}
                            isRequired={false}
                            disabled={!canEdit}
                          />
                          <NumericField
                            label="Est. Weight (kg)"
                            isRequired
                            value={editForm.estimatedWeightKg}
                            onValueChange={(vals) =>
                              setEditForm((prev) => ({
                                ...prev,
                                estimatedWeightKg: vals.floatValue ?? "",
                              }))
                            }
                            disabled={!canEdit}
                          />

                          {/* ── Classification fields ── */}
                          <SelectField
                            label="Hybrid"
                            name="hybrid"
                            value={editForm.hybrid}
                            onChange={handleChange}
                            options={settings?.deployments?.hybrid ?? []}
                            disabled={!canEdit}
                          />
                          <SelectField
                            label="Territory"
                            name="territory"
                            value={editForm.territory}
                            onChange={handleChange}
                            options={settings?.deployments?.territory ?? []}
                            disabled={!canEdit}
                          />
                          <SelectField
                            label="Flagging"
                            name="flagging"
                            value={editForm.flagging}
                            onChange={handleChange}
                            options={settings?.deployments?.flagging ?? []}
                            disabled={!canEdit}
                          />
                          <div className="col-span-1 sm:col-span-3">
                            <InputField
                              label="Flagging Remarks"
                              name="flaggingRemarks"
                              value={editForm.flaggingRemarks}
                              onChange={handleChange}
                              placeholder="Flagging Remarks"
                              isRequired={false}
                              maxLength={300}
                              disabled={!canEdit}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ── Operational ── */}
                    <div className="space-y-2">
                      <p className="text-xxs sm:text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Operational
                      </p>
                      <div className="border border-gray-200 rounded-xl p-4 max-sm:p-3 bg-gray-50/50">
                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                          <InputField
                            label="TMO No."
                            name="tmoNo"
                            value={field?.tmoNo ?? ""}
                            onChange={() => {}}
                            placeholder="—"
                            disabled
                            isRequired={false}
                          />
                          <InputField
                            label="Deployment Code"
                            name="deploymentCode"
                            value={field?.deploymentId?.deploymentCode ?? ""}
                            onChange={() => {}}
                            placeholder="—"
                            disabled
                            isRequired={false}
                          />
                          <InputField
                            label="Pick-up In"
                            type="datetime-local"
                            name="pickupIn"
                            value={editForm.pickupIn}
                            onChange={handleChange}
                            isRequired={false}
                            disabled={!canEdit}
                          />
                          <InputField
                            label="Pick-up Out"
                            type="datetime-local"
                            name="pickupOut"
                            value={editForm.pickupOut}
                            onChange={handleChange}
                            isRequired={false}
                            disabled={!canEdit}
                          />
                          <div className="grid grid-cols-3 gap-4 col-span-full">
                            <NumericField
                              label="Field Weight (kg)"
                              value={editForm.fieldWeightKg}
                              onValueChange={(vals) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  fieldWeightKg: vals.floatValue ?? "",
                                }))
                              }
                              disabled={!canEdit}
                              isRequired={false}
                            />
                            <NumericField
                              label="Plant Weight (kg)"
                              value={editForm.plantWeightKg}
                              onValueChange={(vals) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  plantWeightKg: vals.floatValue ?? "",
                                }))
                              }
                              disabled={!canEdit}
                              isRequired={false}
                            />
                            <NumericField
                              label="Sacks Count"
                              value={editForm.sacksCount}
                              thousandSeparator={false}
                              decimalScale={0}
                              onValueChange={(vals) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  sacksCount: vals.floatValue ?? "",
                                }))
                              }
                              disabled={!canEdit}
                              isRequired={false}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              {/* Action bar */}
              <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
                {isEditMode ? (
                  <>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={isLoading}
                      className="px-8 py-2.5 rounded-xl font-semibold text-sm uppercase tracking-wide bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      form="pickup-field-details-form"
                      disabled={isLoading}
                      className="px-8 py-2.5 rounded-xl font-semibold text-white text-sm uppercase tracking-wide shadow-md hover:shadow-lg cursor-pointer active:scale-[0.99] transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
                      style={{
                        background:
                          "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      }}
                    >
                      {isLoading ? (
                        <>
                          <span className="loading loading-spinner loading-xs sm:loading-sm" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <FaSave className="text-base" />
                          <span>Save</span>
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsEditMode(true)}
                      disabled={isLoading}
                      className="px-6 py-2.5 rounded-xl font-semibold text-white text-sm uppercase tracking-wide shadow-md hover:shadow-lg cursor-pointer active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      style={{
                        background:
                          "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                      }}
                    >
                      <TbPencilMinus className="text-base" />
                      <span>Update</span>
                    </button>
                    {field?.status === "not_done" && (
                      <button
                        type="button"
                        onClick={onOpenDelete}
                        disabled={isLoading}
                        className="px-6 py-2.5 rounded-xl font-semibold text-white text-sm uppercase tracking-wide shadow-md hover:shadow-lg cursor-pointer active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 ml-auto text-nowrap"
                        style={{
                          background:
                            "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                        }}
                      >
                        <TbTrash className="text-base" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  );
}

export default PickupFieldDetailsModal;
