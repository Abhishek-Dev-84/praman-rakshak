import { useState } from 'react'
import { Fingerprint, KeyRound, Loader2, CheckCircle2 } from 'lucide-react'
import Modal from './Modal'

const STEPS = {
  CONFIRM: 'confirm',
  SCANNING: 'scanning',
  OTP: 'otp',
  SUCCESS: 'success',
}

export default function SignatureConfirmModal({
  open,
  onClose,
  onConfirmed,
  title = 'Confirm Action',
  message = 'By signing, you are digitally approving this document. This action is permanent, binds the record to your verified identity, and enters it into the secure audit trail.',
  actionLabel = 'Sign & Approve for Record',
}) {
  const [step, setStep] = useState(STEPS.CONFIRM)
  const [otp, setOtp] = useState('')

  const reset = () => {
    setStep(STEPS.CONFIRM)
    setOtp('')
  }

  const close = () => {
    reset()
    onClose?.()
  }

  const runBiometric = () => {
    setStep(STEPS.SCANNING)
    setTimeout(() => {
      setStep(STEPS.SUCCESS)
      setTimeout(() => {
        onConfirmed?.({ method: 'biometric' })
        close()
      }, 900)
    }, 1600)
  }

  const submitOtp = (e) => {
    e.preventDefault()
    setStep(STEPS.SCANNING)
    setTimeout(() => {
      setStep(STEPS.SUCCESS)
      setTimeout(() => {
        onConfirmed?.({ method: 'otp' })
        close()
      }, 900)
    }, 1100)
  }

  return (
    <Modal open={open} onClose={close} title={title} size="sm">
      <div className="flex flex-col items-center text-center py-2">
        {step === STEPS.CONFIRM && (
          <>
            <div className="rounded-full bg-gold-50 p-5 mb-4">
              <Fingerprint className="text-gold-500" size={40} />
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
            <button onClick={runBiometric} className="btn-gold w-full mt-5">
              <Fingerprint size={18} /> Confirm with Biometrics
            </button>
            <button
              onClick={() => setStep(STEPS.OTP)}
              className="text-xs font-semibold text-navy-600 hover:underline mt-3"
            >
              Use password + OTP instead
            </button>
          </>
        )}

        {step === STEPS.OTP && (
          <form onSubmit={submitOtp} className="w-full text-left">
            <div className="flex flex-col items-center mb-4">
              <div className="rounded-full bg-navy-50 p-4 mb-2">
                <KeyRound className="text-navy-600" size={28} />
              </div>
              <p className="text-sm text-slate-600 text-center">
                Enter your password and the OTP sent to your registered device.
              </p>
            </div>
            <label className="label">Password</label>
            <input type="password" required className="input mb-3" placeholder="••••••••" />
            <label className="label">OTP Code</label>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              maxLength={6}
              className="input tracking-[0.5em] text-center font-semibold"
              placeholder="------"
            />
            <button type="submit" className="btn-primary w-full mt-4">
              Verify &amp; Sign
            </button>
          </form>
        )}

        {step === STEPS.SCANNING && (
          <div className="py-6">
            <Loader2 className="animate-spin text-navy-600 mx-auto mb-3" size={36} />
            <p className="text-sm font-semibold text-navy-700">Verifying your identity…</p>
            <p className="text-xs text-slate-400 mt-1">Do not close this window</p>
          </div>
        )}

        {step === STEPS.SUCCESS && (
          <div className="py-6">
            <CheckCircle2 className="text-emerald-500 mx-auto mb-3" size={40} />
            <p className="text-sm font-semibold text-navy-700">Identity confirmed</p>
            <p className="text-xs text-slate-400 mt-1">Recording to secure audit trail…</p>
          </div>
        )}

        {step === STEPS.CONFIRM && (
          <button onClick={close} className="text-xs font-medium text-slate-400 hover:text-slate-600 mt-4">
            Cancel
          </button>
        )}
      </div>
    </Modal>
  )
}
