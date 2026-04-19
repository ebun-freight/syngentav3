import React, { useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  TransitionChild,
} from "@headlessui/react";
import { IoClose } from "react-icons/io5";
import { TbMapPinFilled } from "react-icons/tb";
import { MdKeyboardArrowDown } from "react-icons/md";
import clsx from "clsx";
import { NumericFormat } from "react-number-format";
import { toast } from "react-toastify";
import useCreatePickupField from "../../hooks/useCreatePickupField";
import { useSettingsContext } from "../../contexts/SettingsContext";

const defaultValue = {
  pickupSite: "",
  municipality: "",
  scheduledPickupTime: "",
  estimatedWeightKg: "",
  fieldContactPerson: "",
  fieldContactPersonNo: "",
  hybrid: "",
  territory: "",
  flagging: "",
  flaggingRemarks: "",
};

/* ── Reusable select wrapper (mirrors CreateDeploymentModal) ── */
const SelectField = ({
  colSpan = 1,
  mobileColSpan,
  label,
  name,
  value,
  onChange,
  options,
  isRequired = true,
}) => {
  const colSpanClass = {
    1: "sm:col-span-1",
    2: "sm:col-span-2",
    3: "sm:col-span-3",
  };
  const mobileColSpanClass = {
    1: "max-sm:col-span-1",
    2: "max-sm:col-span-2",
    3: "max-sm:col-span-3",
  };

  return (
    <div
      className={clsx(
        mobileColSpan ? mobileColSpanClass[mobileColSpan] : "",
        colSpanClass[colSpan] ?? "sm:col-span-1",
        "flex flex-col gap-1.5",
      )}
    >
      <span className="text-xxs sm:text-xs font-semibold text-gray-600 uppercase tracking-wider">
        {label} {isRequired && <span className="text-red-400">*</span>}
      </span>
      <div className="relative group flex items-center bg-white border border-gray-200 rounded-xl px-4 py-3 max-sm:px-3 max-sm:py-2.5 focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20 transition-all duration-200 shadow-sm">
        <select
          name={name}
          value={value}
          onChange={onChange}
          required={isRequired}
          className="w-full appearance-none bg-transparent text-sm max-sm:text-xs text-gray-800 focus:outline-none capitalize"
        >
          <option value="" disabled>
            Select
          </option>
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
};

/* ── Reusable InputField ── */
const InputField = ({
  colSpan = 1,
  mobileColSpan,
  label,
  placeholder = "",
  type,
  name,
  value,
  onChange,
  disabled,
  maxLength,
  isRequired = true,
}) => {
  const colSpanClass = {
    1: "sm:col-span-1",
    2: "sm:col-span-2",
    3: "sm:col-span-3",
  };
  const mobileColSpanClass = {
    1: "max-sm:col-span-1",
    2: "max-sm:col-span-2",
    3: "max-sm:col-span-3",
  };

  return (
    <label
      className={clsx(
        mobileColSpan ? mobileColSpanClass[mobileColSpan] : "",
        colSpanClass[colSpan] ?? "sm:col-span-1",
        "flex flex-col gap-1.5",
      )}
    >
      <span className="text-xxs sm:text-xs font-semibold text-gray-600 uppercase tracking-wider">
        {label} {isRequired && <span className="text-red-400">*</span>}
      </span>
      <div
        className={clsx(
          "flex items-center bg-white border border-gray-200 rounded-xl px-4 py-3 max-sm:px-3 max-sm:py-2.5 overflow-hidden",
          "focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20",
          "transition-all duration-200 shadow-sm",
          { "opacity-60 cursor-not-allowed": disabled },
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
          maxLength={maxLength || 50}
          className={clsx(
            "flex-1 min-w-0 text-sm max-sm:text-xs text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none",
            { capitalize: type !== "datetime-local" },
          )}
        />
      </div>
    </label>
  );
};

function CreateStopModal({ isOpen, onClose, onCreate }) {
  const { settings } = useSettingsContext();
  const [formData, setFormData] = useState(defaultValue);
  const { createPickupFieldFunction, isLoading } = useCreatePickupField();

  const handleClose = () => {
    onClose();
    setFormData(defaultValue);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { data, error } = await createPickupFieldFunction(formData);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Pickup field created successfully!");
    onCreate(data.pickupField);
    handleClose();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={isLoading ? () => {} : handleClose}
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
          <DialogPanel className="font-poppins text-gray-900 w-full max-w-3xl rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[85vh]">
            <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
              {/* Header */}
              <div className="flex items-start justify-between px-6 pt-5 pb-4 max-sm:px-4 max-sm:pt-4 max-sm:pb-3 border-b border-gray-100 shrink-0">
                <div>
                  <h2 className="text-gray-900 font-bold text-lg max-sm:text-base">
                    Create a Pickup Stop
                  </h2>
                  <p className="text-gray-400 text-xs mt-0.5">
                    Fill in the pickup stop details.
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  disabled={isLoading}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg text-xl transition-all cursor-pointer disabled:opacity-40 shrink-0 ml-4"
                >
                  <IoClose />
                </button>
              </div>

              {/* Form body */}
              <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
                <form id="create-stop-form" onSubmit={handleSubmit}>
                  {/* ── Pickup Details ── */}
                  <div className="px-6 pt-5 pb-4 max-sm:px-4 max-sm:pt-4 max-sm:pb-3 border-b border-gray-100">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Pickup Details
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                      <InputField
                        label="Pick-up Site"
                        type="text"
                        name="pickupSite"
                        placeholder="Pick-up Site"
                        value={formData.pickupSite}
                        onChange={handleChange}
                      />
                      <InputField
                        label="Municipality"
                        type="text"
                        name="municipality"
                        placeholder="Municipality"
                        value={formData.municipality}
                        onChange={handleChange}
                      />
                      <InputField
                        label="Scheduled Pickup Time"
                        type="datetime-local"
                        name="scheduledPickupTime"
                        value={formData.scheduledPickupTime}
                        onChange={handleChange}
                        isRequired={false}
                      />

                      {/* Est. Weight */}
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xxs sm:text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Est. Weight (kg){" "}
                          <span className="text-red-400">*</span>
                        </span>
                        <div className="flex items-center bg-white border border-gray-200 rounded-xl px-4 py-3 max-sm:px-3 max-sm:py-2.5 focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20 transition-all duration-200 shadow-sm">
                          <NumericFormat
                            thousandSeparator
                            decimalScale={2}
                            allowNegative={false}
                            value={formData.estimatedWeightKg}
                            onValueChange={(values) =>
                              setFormData((prev) => ({
                                ...prev,
                                estimatedWeightKg: values.floatValue || "",
                              }))
                            }
                            placeholder="Estimated Weight"
                            required
                            className="flex-1 text-sm max-sm:text-xs text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none"
                          />
                        </div>
                      </div>

                      <InputField
                        label="Field Contact Person"
                        type="text"
                        name="fieldContactPerson"
                        placeholder="Field Contact Person"
                        value={formData.fieldContactPerson}
                        onChange={handleChange}
                        isRequired={false}
                      />
                      <InputField
                        label="Field Contact No."
                        type="tel"
                        name="fieldContactPersonNo"
                        placeholder="Contact Number"
                        value={formData.fieldContactPersonNo}
                        onChange={handleChange}
                        maxLength={11}
                        isRequired={false}
                      />
                    </div>
                  </div>

                  {/* ── Classification Details ── */}
                  <div className="px-6 pt-4 pb-5 max-sm:px-4">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Classification Details
                    </h3>

                    {/* Desktop (sm+): 3-col layout */}
                    <div className="hidden sm:grid sm:grid-cols-3 gap-4">
                      <SelectField
                        label="Hybrid"
                        name="hybrid"
                        value={formData.hybrid}
                        onChange={handleChange}
                        options={settings.deployments.hybrid}
                        isRequired={false}
                      />
                      <SelectField
                        label="Territory"
                        name="territory"
                        value={formData.territory}
                        onChange={handleChange}
                        options={settings.deployments.territory}
                        isRequired={false}
                      />
                      <SelectField
                        label="Flagging"
                        name="flagging"
                        value={formData.flagging}
                        onChange={handleChange}
                        options={settings.deployments.flagging}
                        isRequired={false}
                      />
                      <InputField
                        label="Flagging Remarks"
                        type="text"
                        name="flaggingRemarks"
                        placeholder="Flagging Remarks"
                        value={formData.flaggingRemarks}
                        onChange={handleChange}
                        isRequired={false}
                        colSpan={3}
                      />
                    </div>

                    {/* Mobile: 2-col layout */}
                    <div className="sm:hidden grid grid-cols-2 gap-3">
                      <SelectField
                        label="Hybrid"
                        name="hybrid"
                        value={formData.hybrid}
                        onChange={handleChange}
                        options={settings.deployments.hybrid}
                        isRequired={false}
                      />
                      <SelectField
                        label="Territory"
                        name="territory"
                        value={formData.territory}
                        onChange={handleChange}
                        options={settings.deployments.territory}
                        isRequired={false}
                      />
                      <SelectField
                        label="Flagging"
                        name="flagging"
                        value={formData.flagging}
                        onChange={handleChange}
                        options={settings.deployments.flagging}
                        isRequired={false}
                        mobileColSpan={2}
                      />
                      <InputField
                        label="Flagging Remarks"
                        type="text"
                        name="flaggingRemarks"
                        placeholder="Flagging Remarks"
                        value={formData.flaggingRemarks}
                        onChange={handleChange}
                        isRequired={false}
                        mobileColSpan={2}
                      />
                    </div>
                  </div>
                </form>
              </div>

              {/* Action bar */}
              <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
                <button
                  type="submit"
                  form="create-stop-form"
                  disabled={isLoading}
                  className="px-4 py-2 md:px-8 md:py-2.5 rounded-lg md:rounded-xl font-semibold text-white text-sm uppercase tracking-wide shadow-md hover:shadow-lg active:scale-[0.99] transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 cursor-pointer"
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
                      <TbMapPinFilled className="text-sm md:text-base" />
                      <span>Create Stop</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  );
}

export default CreateStopModal;
