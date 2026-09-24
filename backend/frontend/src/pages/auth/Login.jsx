import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Eye,
  EyeOff,
  Fingerprint,
  Loader2,
  ArrowLeft,
  AlertCircle,
  UserRound,
  LockKeyhole,
  BriefcaseBusiness,
  ShieldCheck,
  Search,
  Scale,
  Gavel,
  Shield,
  Info,
  BadgeCheck,
} from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { useUI } from '../../context/UIContext'
import {
  ROLES,
  ROLE_LABELS,
  normalizeRole,
} from '../../utils/constants'


// ============================================================
// ASSETS
// ============================================================

import headerImage from '../../assets/header/praman-rakshak-header.png'

import adminBg from '../../assets/login/admin-bg.jpg'
import policeBg from '../../assets/login/police-bg.jpg'
import investigatorBg from '../../assets/login/investigator-bg.jpg'
import legalOfficerBg from '../../assets/login/legal-officer-bg.jpg'
import judgeBg from '../../assets/login/judge-bg.jpg'


// ============================================================
// ROLE CONFIGURATION
// ============================================================

const ROLE_CONFIG = {
  [ROLES.ADMIN]: {
    roleName: 'Administrator',
    subtitle: 'Sign in to manage the system',
    idLabel: 'Enter your User ID',
    demoId: 'abhi',

    background: adminBg,

    icon: BriefcaseBusiness,

    accent: '#C88719',
    accentLight: '#F5E8CF',

    heading: (
      <>
        Managing
        <br />
        Secure Systems
        <br />
        for a Stronger India
      </>
    ),

    bottomText: (
      <>
        People&nbsp;&nbsp; | &nbsp;&nbsp;
        Process&nbsp;&nbsp; | &nbsp;&nbsp;
        Technology&nbsp;&nbsp; | &nbsp;&nbsp;
        Security
      </>
    ),
  },

  [ROLES.POLICE]: {
    roleName: 'Police Officer',
    subtitle: 'Sign in to access police records',
    idLabel: 'Enter your User ID',
    demoId: 'police_officer',

    background: policeBg,

    icon: ShieldCheck,

    accent: '#1554B7',
    accentLight: '#DDEAFE',

    heading: (
      <>
        Serve
        <br />
        Protect
        <br />
        Preserve
      </>
    ),

    bottomText: (
      <>
        Safer Citizens
        <br />
        Stronger India
      </>
    ),
  },

  [ROLES.INVESTIGATOR]: {
    roleName: 'Investigator',
    subtitle: 'Sign in to access investigation records',
    idLabel: 'Enter your User ID',
    demoId: 'investigator_user',

    background: investigatorBg,

    icon: Search,

    accent: '#078B57',
    accentLight: '#DDF3EA',

    heading: (
      <>
        Investigate
        <br />
        Analyze
        <br />
        Uncover Truth
      </>
    ),

    bottomText: (
      <>
        Evidence Today
        <br />
        A Safer Tomorrow
      </>
    ),
  },

  [ROLES.LEGAL_OFFICER]: {
    roleName: 'Legal Officer',
    subtitle: 'Sign in to access legal documents',
    idLabel: 'Enter your User ID',
    demoId: 'legal_officer',

    background: legalOfficerBg,

    icon: Scale,

    accent: '#6B21A8',
    accentLight: '#EEE3F7',

    heading: (
      <>
        Law
        <br />
        Process
        <br />
        Justice
      </>
    ),

    bottomText: (
      <>
        Enabling
        <br />
        Legal Proceedings
        <br />
        for a Stronger India
      </>
    ),
  },

  [ROLES.JUDGE]: {
    roleName: 'Judge',
    subtitle: 'Sign in to access judicial records',
    idLabel: 'Enter your User ID',
    demoId: 'judge_user',

    background: judgeBg,

    icon: Gavel,

    accent: '#C45D0A',
    accentLight: '#F6E5D6',

    heading: (
      <>
        Deliver
        <br />
        Justice
        <br />
        Build a Safer India
      </>
    ),

    bottomText: (
      <>
        Trusted Records
        <br />
        for a Stronger Nation.
      </>
    ),
  },
}


// ============================================================
// DASHBOARD ROUTES
// ============================================================

const HOME_PATH = {
  [ROLES.JUDGE]: '/judge/docket',
  [ROLES.INVESTIGATOR]: '/investigator/dashboard',
  [ROLES.LEGAL_OFFICER]: '/legal/cases',
  [ROLES.POLICE]: '/police/dashboard',
  [ROLES.ADMIN]: '/admin/dashboard',

  admin: '/admin/dashboard',
  police: '/police/dashboard',
  investigator: '/investigator/dashboard',
  legalOfficer: '/legal/cases',
  judge: '/judge/docket',

  ADMIN: '/admin/dashboard',
  OFFICER: '/police/dashboard',
  INVESTIGATOR: '/investigator/dashboard',
  LEGAL_OFFICER: '/legal/cases',
  JUDGE: '/judge/docket',
}


// ============================================================
// LOGIN PAGE
// ============================================================

export default function Login() {
  const { role } = useParams()
  const navigate = useNavigate()

  const { login } = useAuth()
  const { pushToast } = useUI()

  const normalizedRole = normalizeRole(role)
  const config = ROLE_CONFIG[normalizedRole]

  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [bioLoading, setBioLoading] = useState(false)

  const [error, setError] = useState('')


  // ==========================================================
  // UNKNOWN ROLE
  // ==========================================================

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">

        <div className="text-center">

          <p className="font-bold text-lg mb-3">
            Unknown portal
          </p>

          <Link
            to="/"
            className="text-blue-400 hover:text-blue-300 underline text-sm"
          >
            Return to portal selection
          </Link>

        </div>

      </div>
    )
  }


  const RoleIcon = config.icon


  // ==========================================================
  // NORMAL LOGIN
  // ==========================================================

  const handleSubmit = async (e) => {
    e.preventDefault()

    setError('')
    setLoading(true)

    try {
      const session = await login(userId, password)

      const userRole = normalizeRole(
        session.role || session.rawRole
      )

      const portalRole = normalizeRole(role)

      if (userRole !== portalRole) {
        pushToast({
          type: 'info',
          title: 'Redirected to Assigned Role',
          message: `Your account is registered as ${
            ROLE_LABELS[userRole] || userRole
          }. Redirecting to your dashboard.`,
        })
      }

      const destination =
        HOME_PATH[userRole] || '/admin/dashboard'

      navigate(destination)

    } catch (err) {
      setError(
        err.message || 'Invalid username or password'
      )

    } finally {
      setLoading(false)
    }
  }


  // ==========================================================
  // BIOMETRIC LOGIN
  // ==========================================================

  const handleBiometric = async () => {
    setBioLoading(true)
    setError('')

    try {
      const session = await login(
        config.demoId,
        '1234'
      )

      pushToast({
        type: 'success',
        title: 'Biometric Verified',
        message: `Biometric identity confirmed. Welcome back, ${session.username}.`,
      })

      const userRole = normalizeRole(
        session.role || session.rawRole
      )

      navigate(
        HOME_PATH[userRole] || '/admin/dashboard'
      )

    } catch (err) {
      setError(
        err.message ||
          'Biometric verification failed. Please try password login.'
      )

    } finally {
      setBioLoading(false)
    }
  }


  // ==========================================================
  // DEMO CREDENTIALS
  // ==========================================================

  const fillDemo = () => {
    setUserId(config.demoId)
    setPassword('1234')
    setError('')
  }


  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="min-h-screen bg-slate-900">


      {/* ======================================================
          GOVERNMENT HEADER
      ======================================================= */}

     <header className="relative z-20 w-full bg-white overflow-hidden">
  <img
    src={headerImage}
    alt="Praman Rakshak Government Header"
    className="block w-full h-auto"
  />
</header>


      {/* ======================================================
          HERO
      ======================================================= */}

      <main className="relative min-h-[calc(100vh-105px)] overflow-hidden">


        {/* Background */}

        <img
          src={config.background}
          alt=""
          className="
            absolute
            inset-0
            w-full
            h-full
            object-cover
          "
        />


        {/* Dark overlay */}

        <div className="absolute inset-0 bg-black/30" />


        {/* Gradient */}

        <div
          className="
            absolute
            inset-0
            bg-gradient-to-r
            from-black/65
            via-black/25
            to-black/5
          "
        />


        {/* ====================================================
            LEFT SIDE CONTENT
        ===================================================== */}

        <div
          className="
            absolute
            left-0
            bottom-0
            z-10
            w-full
            md:w-[55%]
            px-7
            md:px-10
            lg:px-14
            pb-8
            md:pb-10
          "
        >

          <h1
            className="
              text-white
              font-serif
              text-3xl
              md:text-4xl
              lg:text-[43px]
              leading-[1.12]
              drop-shadow-lg
            "
          >
            {config.heading}
          </h1>


          {/* Tricolor */}

          <div className="flex mt-5 mb-4">

            <div
              className="w-7 h-[3px]"
              style={{
                backgroundColor: '#F28C28',
              }}
            />

            <div className="w-7 h-[3px] bg-white" />

            <div
              className="w-7 h-[3px]"
              style={{
                backgroundColor: '#16864A',
              }}
            />

          </div>


          <p className="text-white text-sm md:text-base leading-relaxed">
            {config.bottomText}
          </p>

        </div>


        {/* ====================================================
            LOGIN CARD
        ===================================================== */}

        <div
          className="
            relative
            z-10
            min-h-[calc(100vh-105px)]
            flex
            items-center
            justify-center
            md:justify-end
            px-4
            md:px-10
            lg:px-16
            py-6
          "
        >

          <div
            className="
              w-full
              max-w-[410px]
              bg-white
              rounded-2xl
              shadow-[0_20px_60px_rgba(0,0,0,0.35)]
              overflow-hidden
            "
          >


            {/* =================================================
                CARD HEADER
            ================================================== */}

            <div
              className="px-6 pt-5 pb-4 border-b"
              style={{
                borderColor: `${config.accent}30`,
                background:
                  `linear-gradient(135deg, ${config.accentLight}55, #ffffff)`,
              }}
            >

              <div className="flex items-center gap-3">

                {/* Role Icon */}

                <div
                  className="
                    w-12
                    h-12
                    rounded-xl
                    flex
                    items-center
                    justify-center
                    shrink-0
                  "
                  style={{
                    backgroundColor:
                      config.accentLight,
                  }}
                >

                  <RoleIcon
                    size={25}
                    strokeWidth={2}
                    style={{
                      color: config.accent,
                    }}
                  />

                </div>


                {/* Role Information */}

                <div className="flex-1">

                  <div className="flex items-center gap-2">

                    <h2 className="text-lg font-bold text-slate-900">
                      {config.roleName}
                    </h2>

                    <span
                      className="
                        text-[9px]
                        font-bold
                        px-2
                        py-0.5
                        rounded-full
                      "
                      style={{
                        color: config.accent,
                        backgroundColor:
                          config.accentLight,
                      }}
                    >
                      OFFICIAL
                    </span>

                  </div>

                  <p className="text-xs text-slate-500 mt-0.5">
                    {config.subtitle}
                  </p>

                </div>

              </div>


              {/* Security line */}

              <div className="flex items-center gap-2 mt-4">

                <Shield
                  size={13}
                  style={{
                    color: config.accent,
                  }}
                />

                <p className="text-[10px] text-slate-500">
                  Restricted government system • Secure authentication
                </p>

              </div>

            </div>


            {/* =================================================
                CARD BODY
            ================================================== */}

            <div className="px-6 py-5">


              {/* =================================================
                  ERROR
              ================================================== */}

              {error && (

                <div
                  className="
                    flex
                    items-start
                    gap-2
                    rounded-lg
                    bg-red-50
                    border
                    border-red-200
                    px-3
                    py-2.5
                    text-red-700
                    text-xs
                    mb-4
                  "
                >

                  <AlertCircle
                    size={15}
                    className="shrink-0 mt-0.5"
                  />

                  <span>
                    {error}
                  </span>

                </div>

              )}


              {/* =================================================
                  AUTHENTICATION
              ================================================== */}

              <div className="flex items-center gap-2 mb-3">

                <div
                  className="
                    w-6
                    h-6
                    rounded-md
                    flex
                    items-center
                    justify-center
                  "
                  style={{
                    backgroundColor:
                      config.accentLight,
                  }}
                >

                  <BadgeCheck
                    size={14}
                    style={{
                      color: config.accent,
                    }}
                  />

                </div>

                <div>

                  <h3 className="text-xs font-bold text-slate-800">
                    Secure Authentication
                  </h3>

                  <p className="text-[9px] text-slate-400">
                    Enter your official credentials
                  </p>

                </div>

              </div>


              {/* =================================================
                  LOGIN FORM
              ================================================== */}

              <form
                onSubmit={handleSubmit}
                className="space-y-3"
              >


                {/* User ID */}

                <div className="relative">

                  <UserRound
                    size={15}
                    className="
                      absolute
                      left-3
                      top-1/2
                      -translate-y-1/2
                      text-slate-400
                    "
                  />

                  <input
                    type="text"
                    value={userId}
                    onChange={(e) =>
                      setUserId(e.target.value)
                    }
                    required
                    placeholder={config.idLabel}
                    className="
                      w-full
                      h-[42px]
                      rounded-lg
                      bg-slate-50
                      border
                      border-slate-200
                      pl-9
                      pr-3
                      text-xs
                      text-slate-800
                      placeholder:text-slate-400
                      focus:bg-white
                      focus:outline-none
                      focus:ring-2
                    "
                    style={{
                      '--tw-ring-color':
                        `${config.accent}45`,
                    }}
                  />

                </div>


                {/* Password */}

                <div className="relative">

                  <LockKeyhole
                    size={15}
                    className="
                      absolute
                      left-3
                      top-1/2
                      -translate-y-1/2
                      text-slate-400
                    "
                  />

                  <input
                    type={
                      showPassword
                        ? 'text'
                        : 'password'
                    }
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    required
                    placeholder="Enter your password"
                    className="
                      w-full
                      h-[42px]
                      rounded-lg
                      bg-slate-50
                      border
                      border-slate-200
                      pl-9
                      pr-10
                      text-xs
                      text-slate-800
                      placeholder:text-slate-400
                      focus:bg-white
                      focus:outline-none
                      focus:ring-2
                    "
                    style={{
                      '--tw-ring-color':
                        `${config.accent}45`,
                    }}
                  />


                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (value) => !value
                      )
                    }
                    className="
                      absolute
                      right-3
                      top-1/2
                      -translate-y-1/2
                      text-slate-400
                      hover:text-slate-700
                    "
                  >

                    {showPassword ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}

                  </button>

                </div>


                {/* Login */}

                <button
                  type="submit"
                  disabled={loading}
                  className="
                    w-full
                    h-[43px]
                    rounded-lg
                    text-white
                    text-xs
                    font-bold
                    flex
                    items-center
                    justify-center
                    gap-2
                    shadow-sm
                    transition
                    hover:brightness-95
                    disabled:opacity-60
                    disabled:cursor-not-allowed
                  "
                  style={{
                    backgroundColor:
                      config.accent,
                  }}
                >

                  {loading && (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  )}

                  {loading
                    ? 'Signing in…'
                    : 'Sign In Securely'}

                </button>

              </form>


              {/* =================================================
                  BIOMETRIC
              ================================================== */}

              <div
                className="
                  mt-4
                  rounded-lg
                  border
                  p-3
                "
                style={{
                  borderColor:
                    `${config.accent}25`,
                  backgroundColor:
                    `${config.accentLight}35`,
                }}
              >

                <div className="flex items-center gap-3">

                  <div
                    className="
                      w-9
                      h-9
                      rounded-lg
                      flex
                      items-center
                      justify-center
                      shrink-0
                    "
                    style={{
                      backgroundColor:
                        config.accentLight,
                    }}
                  >

                    <Fingerprint
                      size={19}
                      style={{
                        color: config.accent,
                      }}
                    />

                  </div>


                  <div className="flex-1">

                    <p className="text-[11px] font-bold text-slate-800">
                      Biometric Verification
                    </p>

                    <p className="text-[9px] text-slate-500 mt-0.5">
                      Use your registered biometric identity
                    </p>

                  </div>

                  <button
                    type="button"
                    onClick={handleBiometric}
                    disabled={bioLoading}
                    className="
                      px-3
                      h-[32px]
                      rounded-md
                      border
                      bg-white
                      text-[9px]
                      font-bold
                      hover:bg-slate-50
                      disabled:opacity-60
                    "
                    style={{
                      color: config.accent,
                      borderColor:
                        `${config.accent}35`,
                    }}
                  >

                    {bioLoading ? (
                      <Loader2
                        size={14}
                        className="animate-spin"
                      />
                    ) : (
                      'Verify'
                    )}

                  </button>

                </div>

              </div>


              {/* =================================================
                  OR
              ================================================== */}

              <div className="flex items-center gap-3 my-4">

                <div className="h-px bg-slate-200 flex-1" />

                <span className="text-[9px] font-medium text-slate-400">
                  OR
                </span>

                <div className="h-px bg-slate-200 flex-1" />

              </div>


              {/* =================================================
                  DEMO CREDENTIALS
              ================================================== */}

              <button
                type="button"
                onClick={fillDemo}
                className="
                  w-full
                  h-[39px]
                  rounded-lg
                  bg-slate-100
                  border
                  border-slate-200
                  text-[#17315C]
                  text-[10px]
                  font-semibold
                  flex
                  items-center
                  justify-center
                  gap-2
                  hover:bg-slate-200
                  transition
                "
              >

                <span className="text-sm">
                  ⚗
                </span>

                Use Demo Credentials

              </button>


              {/* =================================================
                  SECURITY NOTICE
              ================================================== */}

              <div className="flex gap-2 mt-4">

                <Info
                  size={13}
                  className="shrink-0 mt-0.5"
                  style={{
                    color: config.accent,
                  }}
                />

                <p className="text-[9px] leading-relaxed text-slate-500">
                  This system contains restricted official
                  records. Access is monitored and logged.
                  Use only your authorized credentials.
                </p>

              </div>


              {/* =================================================
                  FOOTER LINKS
              ================================================== */}

              <div className="mt-4 pt-4 border-t border-slate-100">

                <Link
                  to="/"
                  className="
                    flex
                    items-center
                    justify-center
                    gap-1
                    text-[10px]
                    font-semibold
                    text-[#17315C]
                    hover:underline
                  "
                >

                  <ArrowLeft size={12} />

                  Back to All Portals

                </Link>


                <div className="text-center mt-3">

                  <span className="text-[10px] text-slate-400">
                    New official?
                  </span>{' '}

                  <Link
                    to={`/register/${role}`}
                    className="
                      text-[10px]
                      font-semibold
                      hover:underline
                    "
                    style={{
                      color: config.accent,
                    }}
                  >
                    Register for access
                  </Link>

                </div>

              </div>

            </div>

          </div>

        </div>

      </main>

    </div>
  )
}