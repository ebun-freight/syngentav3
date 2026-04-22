import React, { useState, useEffect, useCallback } from "react";
import { FaFilter, FaPlus, FaSearch } from "react-icons/fa";
import { IoClose } from "react-icons/io5";
import {
  MdOutlineKeyboardArrowLeft,
  MdOutlineKeyboardArrowRight,
} from "react-icons/md";
import clsx from "clsx";
import CreateStopModal from "../../components/modals/CreateStopModal";
import PickupFieldDetailsModal from "../../components/modals/PickupFieldDetailsModal";
import DeletePickupFieldModal from "../../components/modals/DeletePickupFieldModal";
import { DateTime } from "luxon";
import useGetAllPickupFields from "../../hooks/useGetAllPickupFields";
import {
  TableEmpty,
  TableError,
  TableLoading,
} from "../../components/TablesState";

/* ── Status config ──────────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  not_done: { label: "Not Done", className: "bg-gray-100 text-gray-500" },
  ongoing: { label: "Ongoing", className: "bg-emerald-50 text-emerald-500" },
  completed: { label: "Completed", className: "bg-blue-50 text-blue-500" },
};

const FLAGGING_CONFIG = {
  red: { label: "red", className: "bg-red-50 text-red-500" },
  green: { label: "green", className: "bg-emerald-50 text-emerald-500" },
  yellow: { label: "yellow", className: "bg-yellow-50 text-yellow-500" },
  orange: { label: "orange", className: "bg-orange-50 text-orange-500" },
};

const formatISO = (iso) =>
  iso
    ? DateTime.fromISO(iso)
        .setZone("Asia/Manila")
        .toFormat("MMM d, yyyy hh:mm a")
    : "—";

const STOP_STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "not_done", label: "Not Done" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
];

function PickupFields() {
  const { getAllPickupFieldsFunction, isLoading, isError } =
    useGetAllPickupFields();

  const [allStops, setAllStops] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editField, setEditField] = useState(null);
  const [deleteField, setDeleteField] = useState(null);
  const [search, setSearch] = useState("");
  const [tempSearch, setTempSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tempStatusFilter, setTempStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const PER_PAGE = 10;

  const fetchFields = useCallback(async () => {
    const result = await getAllPickupFieldsFunction({
      search,
      status: statusFilter,
      page,
      perPage: PER_PAGE,
      sort: "latest",
    });
    if (!result.error) {
      setAllStops(result.pickupFields);
      setTotal(result.total);
      setTotalPages(result.totalPages || 1);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  const handleApplyFilters = () => {
    setSearch(tempSearch);
    setStatusFilter(tempStatusFilter);
    setPage(1);
  };

  const handleResetFilters = () => {
    setTempSearch("");
    setTempStatusFilter("");
    setSearch("");
    setStatusFilter("");
    setPage(1);
  };

  const handleClearSearch = () => {
    setTempSearch("");
    setSearch("");
    setPage(1);
  };

  const handleAddStop = (newStop) => {
    setAllStops((prev) => [newStop, ...prev]);
    setTotal((prev) => prev + 1);
  };

  const handleEditStop = (stop) => setEditField(stop);

  const handleUpdateStop = (updatedStop) => {
    setAllStops((prev) =>
      prev.map((s) => (s._id === updatedStop._id ? updatedStop : s)),
    );
    setEditField(null);
  };

  const btnBase =
    "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <>
      <div className="flex-1 flex flex-col gap-2 sm:gap-4 lg:gap-6">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap max-xl:flex-col justify-between xl:items-start gap-y-4">
          <div className="flex justify-between flex-1 items-center">
            <div>
              <h1 className="font-bold text-lg sm:text-xl md:text-2xl text-gray-800">
                Pickup Fields
              </h1>
              <p className="text-xs text-gray-400 mt-0.5 max-md:hidden">
                Encode and manage pickup field stops for deployments
              </p>
            </div>

            <div className="flex gap-2  xl:hidden">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className={clsx(
                  btnBase,
                  "bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100",
                )}
              >
                <FaPlus className="text-xs" />
                <span>Add Stop</span>
              </button>
            </div>
          </div>

          <div className="flex-1 flex max-sm:flex-col justify-between gap-2 sm:gap-4">
            {/* Search */}
            <div className="flex flex-1 min-w-0 xl:w-64 items-center bg-white border border-gray-200 rounded-xl px-3 py-2 gap-2 focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/20 transition-all shadow-sm">
              <FaSearch className="text-gray-400 text-xs shrink-0" />
              <input
                type="text"
                placeholder="Search stops..."
                value={tempSearch}
                onChange={(e) => setTempSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
                autoComplete="off"
                className="w-full min-w-0 focus:outline-none text-sm text-gray-700 placeholder-gray-400 bg-transparent"
              />
              <button
                type="button"
                onClick={handleClearSearch}
                className={clsx(
                  "rounded-full p-0.5 hover:bg-gray-100 cursor-pointer transition-all duration-200",
                  {
                    "opacity-100": tempSearch,
                    "opacity-0 pointer-events-none": !tempSearch,
                  },
                )}
              >
                <IoClose className="text-base text-gray-400" />
              </button>
            </div>

            <div className="flex gap-2 max-sm:justify-between max-sm:w-full">
              {/* Filter */}
              <div className="dropdown dropdown-start sm:dropdown-center">
                <div
                  tabIndex={0}
                  role="button"
                  className={clsx(
                    btnBase,
                    "relative bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm",
                  )}
                >
                  <FaFilter className="text-xs" />
                  <span>Filter</span>
                  {tempStatusFilter && (
                    <span className="w-2 aspect-square rounded-full bg-emerald-500 shrink-0 absolute -top-0.5 -right-0.5" />
                  )}
                </div>

                <div
                  tabIndex="0"
                  className="dropdown-content menu mt-2 bg-white shadow-md rounded-xl border border-gray-100 w-[calc(100vw-2rem)] max-w-xs p-3 sm:p-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Filter Options
                  </p>
                  <div className="flex flex-col gap-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-xxs font-semibold text-gray-500 uppercase tracking-wider">
                        Status
                      </span>
                      <div className="flex items-center bg-white border border-gray-200 rounded-xl px-3 py-2 focus-within:border-primaryColor transition-all">
                        <select
                          value={tempStatusFilter}
                          onChange={(e) => setTempStatusFilter(e.target.value)}
                          className="w-full focus:outline-none text-xs sm:text-sm text-gray-700 bg-transparent capitalize"
                        >
                          {STOP_STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </label>

                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        onClick={handleResetFilters}
                        className={clsx(
                          btnBase,
                          "justify-center bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 text-xs sm:text-sm",
                        )}
                      >
                        Reset
                      </button>
                      <button
                        onClick={handleApplyFilters}
                        className={clsx(
                          btnBase,
                          "justify-center bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 text-xs sm:text-sm",
                        )}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pagination */}
              <div className="flex items-center bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 text-xl hover:bg-gray-50 cursor-pointer border-r border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <MdOutlineKeyboardArrowLeft />
                </button>
                <p className="text-xs text-gray-600 sm:min-w-24 text-center px-2">
                  Page {total > 0 ? page : 0} of {totalPages}
                </p>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 text-xl hover:bg-gray-50 cursor-pointer border-l border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <MdOutlineKeyboardArrowRight />
                </button>
              </div>

              {/* xl Create */}
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className={clsx(
                  btnBase,
                  "bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 max-xl:hidden",
                )}
              >
                <FaPlus className="text-xs" />
                <span>Add Stop</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Table ──────────────────────────────────────────────────────── */}
        {isLoading ? (
          <TableLoading />
        ) : isError ? (
          <TableError />
        ) : allStops.length === 0 ? (
          <TableEmpty />
        ) : (
          <div className="relative flex-1 overflow-y-auto scrollbar-thin bg-white">
            <div className="absolute inset-0">
              <table className="table text-xs sm:table-sm table-pin-rows table-pin-cols">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
                    <td>{total}</td>
                    <td>Scheduled Pickup Time</td>
                    <td>Pick-up Site</td>
                    <td>Municipality</td>
                    <td>Territory</td>
                    <td>Hybrid</td>
                    <td>Flagging</td>
                    <td>Est. Weight (kg)</td>
                    <td>Status</td>
                    <td>Deployment</td>
                  </tr>
                </thead>
                <tbody>
                  {allStops.map((stop, index) => {
                    const statusCfg =
                      STATUS_CONFIG[stop.status] || STATUS_CONFIG.not_done;
                    return (
                      <tr
                        key={stop._id}
                        onClick={() => handleEditStop(stop)}
                        className="border-b border-gray-100 last:border-none hover:bg-gray-50 capitalize align-top transition-colors text-gray-600 cursor-pointer"
                      >
                        <td className="text-xxs sm:text-xs font-semibold text-gray-400">
                          {(page - 1) * PER_PAGE + index + 1}
                        </td>

                        <td>
                          <span className="text-nowrap text-xxs sm:text-xs">
                            {formatISO(stop.scheduledPickupTime)}
                          </span>
                        </td>

                        <td>
                          <p className="text-nowrap">{stop.pickupSite}</p>
                        </td>

                        <td>
                          <p className="text-nowrap">{stop.municipality}</p>
                        </td>

                        <td>
                          <p className="text-nowrap">{stop.territory || "—"}</p>
                        </td>

                        <td>
                          <p className="text-nowrap">{stop.hybrid || "—"}</p>
                        </td>

                        <td>
                          {stop.flagging ? (
                            <div
                              className={clsx(
                                "px-2.5 py-1 rounded-full w-fit text-xxs sm:text-xs text-nowrap",
                                (
                                  FLAGGING_CONFIG[stop.flagging] || {
                                    className: "bg-gray-100 text-gray-500",
                                  }
                                ).className,
                              )}
                            >
                              {
                                (
                                  FLAGGING_CONFIG[stop.flagging] || {
                                    label: stop.flagging,
                                  }
                                ).label
                              }
                            </div>
                          ) : (
                            <span className="italic text-gray-400 font-light text-xxs sm:text-xs">
                              —
                            </span>
                          )}
                        </td>

                        <td>
                          <span className="text-nowrap">
                            {stop.estimatedWeightKg?.toLocaleString()} kg
                          </span>
                        </td>

                        <td>
                          <div
                            className={clsx(
                              "px-2.5 py-1 rounded-full w-fit text-xxs sm:text-xs text-nowrap",
                              statusCfg.className,
                            )}
                          >
                            {statusCfg.label}
                          </div>
                        </td>

                        <td>
                          {stop.deploymentId?.deploymentCode ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-nowrap text-xxs text-gray-600">
                                {stop.deploymentId.deploymentCode}
                              </span>

                              <span className="text-nowrap text-xxs sm:text-xs text-gray-600">
                                {stop.tmoNo}
                              </span>
                            </div>
                          ) : (
                            <span className="italic text-gray-400 font-light text-xxs sm:text-xs">
                              Unassigned
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <CreateStopModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleAddStop}
      />

      <PickupFieldDetailsModal
        isOpen={!!editField}
        onClose={() => setEditField(null)}
        field={editField}
        onUpdate={handleUpdateStop}
        onOpenDelete={() => {
          setDeleteField(editField);
          setEditField(null);
        }}
      />

      <DeletePickupFieldModal
        isOpen={!!deleteField}
        onClose={() => setDeleteField(null)}
        field={deleteField}
        onDelete={(id) => {
          setAllStops((prev) => prev.filter((s) => s._id !== id));
          setTotal((prev) => prev - 1);
          setDeleteField(null);
        }}
      />
    </>
  );
}

export default PickupFields;
