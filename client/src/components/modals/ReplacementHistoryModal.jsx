import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  TransitionChild
} from '@headlessui/react'
import { IoClose } from 'react-icons/io5'
import { DateTime } from 'luxon'
import clsx from 'clsx'
import { TbHistory } from 'react-icons/tb'

/* ─── Decorative dot pattern ────────────────────────────────────────────── */
const DotPattern = () => (
  <svg
    className='absolute inset-0 w-full h-full opacity-10 pointer-events-none'
    xmlns='http://www.w3.org/2000/svg'
  >
    <defs>
      <pattern
        id='dots-replacement-history'
        x='0'
        y='0'
        width='20'
        height='20'
        patternUnits='userSpaceOnUse'
      >
        <circle cx='2' cy='2' r='1.2' fill='white' />
      </pattern>
    </defs>
    <rect width='100%' height='100%' fill='url(#dots-replacement-history)' />
  </svg>
)

function ReplacementHistoryModal ({ isOpen, onClose, deployment }) {
  const hasReplacement = deployment?.replacement?.replacementTruckId?._id

  return (
    <Dialog open={isOpen} onClose={onClose} className='relative z-50'>
      {/* Backdrop */}
      <TransitionChild
        enter='ease-out duration-300'
        enterFrom='opacity-0'
        enterTo='opacity-100'
        leave='ease-in duration-200'
        leaveFrom='opacity-100'
        leaveTo='opacity-0'
      >
        <DialogBackdrop className='fixed inset-0 bg-black/40 backdrop-blur-sm' />
      </TransitionChild>

      {/* Modal container */}
      <div className='fixed inset-0 flex items-center justify-center p-4 max-sm:p-2'>
        <TransitionChild
          enter='ease-out duration-300'
          enterFrom='opacity-0 scale-95 translate-y-2'
          enterTo='opacity-100 scale-100 translate-y-0'
          leave='ease-in duration-200'
          leaveFrom='opacity-100 scale-100'
          leaveTo='opacity-0 scale-95'
        >
          <DialogPanel className='font-poppins text-gray-900 w-full max-w-4xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[88vh] max-md:max-h-[80vh]'>
            {/* ══ DARK HEADER ═════════════════════════════════════════════════ */}
            <div
              className='relative flex items-center justify-between px-6 py-5 max-sm:px-4 max-sm:py-4 shrink-0 overflow-hidden'
              style={{
                background:
                  'linear-gradient(155deg, #020617 0%, #001e36 55%, #0f172a 100%)'
              }}
            >
              <DotPattern />

              {/* Radial glows */}
              <div
                className='absolute -top-10 -left-10 w-40 h-40 rounded-full opacity-10 pointer-events-none'
                style={{
                  background:
                    'radial-gradient(circle, #475569 0%, transparent 70%)'
                }}
              />
              <div
                className='absolute -bottom-10 -right-10 w-40 h-40 rounded-full opacity-10 pointer-events-none'
                style={{
                  background:
                    'radial-gradient(circle, #334155 0%, transparent 70%)'
                }}
              />

              {/* Icon + title */}
              <div className='relative z-10 flex items-center gap-4'>
                <div className='w-11 h-11 rounded-xl flex items-center justify-center border-2 border-dashed border-white/40 bg-white/5 shrink-0'>
                  <TbHistory className='text-white/60 text-xl' />
                </div>
                <div>
                  <h2 className='text-white font-bold text-base max-sm:text-sm leading-tight'>
                    Replacement History
                  </h2>
                  <p className='text-white/40 text-xs mt-0.5'>
                    Original vs. replacement assignment details.
                  </p>
                </div>
              </div>

              {/* Badge + close */}
              <div className='relative z-10 flex items-center gap-3'>
                <span
                  className={clsx(
                    'inline-flex px-3 py-1 rounded-full text-xxs font-semibold border max-sm:hidden',
                    hasReplacement
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                      : 'bg-gray-100 text-gray-500 border-gray-200'
                  )}
                >
                  {hasReplacement ? 'Replaced' : 'No Replacement'}
                </span>
                <button
                  onClick={onClose}
                  className='text-white/50 hover:text-white hover:bg-white/10 p-1.5 rounded-lg text-xl transition-all cursor-pointer shrink-0'
                >
                  <IoClose />
                </button>
              </div>
            </div>

            {/* ══ SCROLLABLE BODY ═════════════════════════════════════════════ */}
            <div className='flex-1 overflow-y-auto scrollbar-thin min-h-0'>
              {hasReplacement ? (
                <div className='px-6 py-5 max-sm:px-4 max-sm:py-4 flex flex-col gap-5'>
                  {/* ── Original vs Replacement ── */}
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                    {/* Original Assignment */}
                    <div className='flex flex-col gap-2'>
                      <div className='flex items-center gap-2'>
                        <span className='w-2 h-2 rounded-full bg-orange-400 shrink-0' />
                        <h3 className='text-xxs sm:text-xs font-semibold text-gray-600 uppercase tracking-wider'>
                          Original Assignment
                        </h3>
                      </div>
                      <div className='grid grid-cols-2 gap-3 bg-orange-50 rounded-xl p-4 border border-orange-100'>
                        <StaticField
                          label='Truck'
                          value={deployment.truckId?.plateNo}
                          color='orange'
                          isUppercase
                        />
                        <StaticField
                          label='Driver'
                          value={`${deployment.driverId.firstname} ${deployment.driverId.lastname}`}
                          color='orange'
                          isCapitalize
                        />
                        <StaticField
                          label='Truck Type'
                          value={deployment.truckType}
                          color='orange'
                          isCapitalize
                        />
                        <StaticField
                          label='Helpers'
                          value={deployment.helperCount}
                          color='orange'
                        />
                      </div>
                    </div>

                    {/* Replacement Assignment */}
                    <div className='flex flex-col gap-2'>
                      <div className='flex items-center gap-2'>
                        <span className='w-2 h-2 rounded-full bg-emerald-400 shrink-0' />
                        <h3 className='text-xxs sm:text-xs font-semibold text-gray-600 uppercase tracking-wider'>
                          Replacement Assignment
                        </h3>
                      </div>
                      <div className='grid grid-cols-2 gap-3 bg-emerald-50 rounded-xl p-4 border border-emerald-100'>
                        <StaticField
                          label='Truck'
                          value={
                            deployment.replacement.replacementTruckId?.plateNo
                          }
                          color='emerald'
                          isUppercase
                        />
                        <StaticField
                          label='Driver'
                          value={`${deployment.replacement.replacementDriverId.firstname} ${deployment.replacement.replacementDriverId.lastname}`}
                          color='emerald'
                          isCapitalize
                        />
                        <StaticField
                          label='Truck Type'
                          value={deployment.replacement.replacementTruckType}
                          color='emerald'
                          isCapitalize
                        />
                        <StaticField
                          label='Helpers'
                          value={deployment.replacement.replacementHelperCount}
                          color='emerald'
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── Replacement Details ── */}
                  <div>
                    <div className='flex items-center gap-2 mb-2'>
                      <span className='w-2 h-2 rounded-full bg-gray-300 shrink-0' />
                      <h3 className='text-xxs sm:text-xs font-semibold text-gray-600 uppercase tracking-wider'>
                        Replacement Details
                      </h3>
                    </div>
                    <div className='bg-gray-50 rounded-xl border border-gray-200 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4'>
                      <div className='flex flex-col gap-4'>
                        <StaticField
                          label='Reason for Replacement'
                          value={deployment.replacement?.reason?.replace(
                            /_/g,
                            ' '
                          )}
                          color='gray'
                          isCapitalize
                        />
                        <StaticField
                          label='Replaced At'
                          value={DateTime.fromISO(
                            deployment.replacement.replacedAt
                          )
                            .setZone('Asia/Manila')
                            .toFormat('MMM d, yyyy - hh:mm a')}
                          color='gray'
                        />
                      </div>

                      {/* Remarks */}
                      <div className='flex flex-col gap-1.5'>
                        <span className='text-xxs sm:text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                          Remarks
                        </span>
                        <div className='flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 max-sm:px-3 max-sm:py-2.5 min-h-16'>
                          <p className='text-sm max-sm:text-xs text-gray-700 leading-relaxed'>
                            {deployment.replacement.remarks || (
                              <span className='text-gray-400 italic'>
                                No remarks provided.
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className='flex flex-col items-center justify-center h-full py-16 px-6 text-center'>
                  <div className='w-16 h-16 rounded-2xl flex items-center justify-center bg-gray-100 mb-4'>
                    <TbHistory className='text-gray-300 text-3xl' />
                  </div>
                  <p className='text-gray-500 font-medium text-sm'>
                    No replacement history
                  </p>
                  <p className='text-gray-400 text-xs mt-1'>
                    This deployment has not had any truck replacements.
                  </p>
                </div>
              )}
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  )
}

/* ─── StaticField ───────────────────────────────────────────────────────── */
const StaticField = ({
  label,
  value,
  isCapitalize = false,
  isUppercase = false,
  color
}) => (
  <div className='flex flex-col gap-1.5'>
    <span
      className={clsx(
        'text-xxs sm:text-xs font-semibold uppercase tracking-wider',
        {
          'text-orange-700': color === 'orange',
          'text-emerald-700': color === 'emerald',
          'text-gray-500': color === 'gray'
        }
      )}
    >
      {label}
    </span>
    <div
      className={clsx(
        'bg-white border rounded-xl px-4 py-3 max-sm:px-3 max-sm:py-2.5 text-sm max-sm:text-xs font-medium shadow-sm',
        {
          capitalize: isCapitalize,
          uppercase: isUppercase,
          'border-orange-200 text-orange-600': color === 'orange',
          'border-emerald-200 text-emerald-600': color === 'emerald',
          'border-gray-200 text-gray-700': color === 'gray'
        }
      )}
    >
      {value || 'N/A'}
    </div>
  </div>
)

export default ReplacementHistoryModal
