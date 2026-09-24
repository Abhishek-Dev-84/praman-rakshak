import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  BriefcaseBusiness,
  ShieldCheck,
  Search,
  Scale,
  Gavel,
  UserRound,
  BadgeCheck,
  Building2,
  Mail,
  Phone,
  LockKeyhole,
  Shield,
  Info,
} from 'lucide-react'

import {
  ROLES,
  ROLE_LABELS,
  normalizeRole,
} from '../../utils/constants'

import { registerRequest } from '../../api/realApi'


// ============================================================
// HEADER
// ============================================================

import headerImage from '../../assets/header/praman-rakshak-header.png'


// ============================================================
// ROLE BACKGROUNDS
// ============================================================

import adminBg from '../../assets/login/admin-bg.jpg'
import policeBg from '../../assets/login/police-bg.jpg'
import investigatorBg from '../../assets/login/investigator-bg.jpg'
import legalOfficerBg from '../../assets/login/legal-officer-bg.jpg'
import judgeBg from '../../assets/login/judge-bg.jpg'


// ============================================================
// DEPARTMENTS
// ============================================================

const DEPARTMENTS = {
  [ROLES.JUDGE]: 'High Court / Sessions Court',
  [ROLES.INVESTIGATOR]: 'State Police Department',
  [ROLES.LEGAL_OFFICER]: 'Legal Department, MHA',
  [ROLES.POLICE]: 'Police Station / District Police',
  [ROLES.ADMIN]: 'Ministry of Home Affairs',
}


// ============================================================
// ROLE CONFIGURATION
// ============================================================

const ROLE_CONFIG = {
  [ROLES.ADMIN]: {
    roleName: 'Administrator',
    background: adminBg,
    accent: '#C88719',
    accentLight: '#F5E8CF',
    icon: BriefcaseBusiness,

    heading: (
      <>
        Secure
        <br />
        Administration
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
    background: policeBg,
    accent: '#1554B7',
    accentLight: '#DDEAFE',
    icon: ShieldCheck,

    heading: (
      <>
        Secure
        <br />
        Police Records
        <br />
        Protect Citizens
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
    background: investigatorBg,
    accent: '#078B57',
    accentLight: '#DDF3EA',
    icon: Search,

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
    background: legalOfficerBg,
    accent: '#6B21A8',
    accentLight: '#EEE3F7',
    icon: Scale,

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
    background: judgeBg,
    accent: '#C45D0A',
    accentLight: '#F6E5D6',
    icon: Gavel,

    heading: (
      <>
        Trusted
        <br />
        Judicial Access
        <br />
        for Justice
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
// REGISTER PAGE
// ============================================================

export default function Register() {
  const { role } = useParams()

  const normalizedRole = normalizeRole(role)
  const config = ROLE_CONFIG[normalizedRole]

  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [password, setPassword] = useState('')
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

  const roleLabel =
    ROLE_LABELS[normalizedRole] ||
    config.roleName ||
    'Official'


  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const form = new FormData(e.currentTarget)
    const roleMapping = {
      [ROLES.ADMIN]: 'ADMIN',
      [ROLES.POLICE]: 'OFFICER',
      [ROLES.INVESTIGATOR]: 'INVESTIGATOR',
      [ROLES.LEGAL_OFFICER]: 'LEGAL_OFFICER',
      [ROLES.JUDGE]: 'JUDGE',
      admin: 'ADMIN',
      police: 'OFFICER',
      investigator: 'INVESTIGATOR',
      legalOfficer: 'LEGAL_OFFICER',
      judge: 'JUDGE',
    }
    const backendRole = roleMapping[normalizedRole] || 'OFFICER'
    const username = form.get('username')?.trim() || form.get('official_id')?.trim()
    const email = form.get('email')?.trim()

    try {
      await registerRequest({
        username,
        email,
        password,
        role: backendRole,
      })
      setDone(true)
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your credentials.')
    } finally {
      setSubmitting(false)
    }
  }


  // ==========================================================
  // PASSWORD STRENGTH
  // ==========================================================

  const getPasswordStrength = () => {
    if (!password) {
      return {
        label: '',
        width: '0%',
      }
    }

    if (password.length < 6) {
      return {
        label: 'Weak',
        width: '30%',
      }
    }

    if (password.length < 10) {
      return {
        label: 'Moderate',
        width: '65%',
      }
    }

    return {
      label: 'Strong',
      width: '100%',
    }
  }

  const passwordStrength = getPasswordStrength()


  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="min-h-screen bg-slate-900">


      {/* ======================================================
          HEADER
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

        <div className="absolute inset-0 bg-black/35" />


        {/* Gradient */}

        <div
          className="
            absolute
            inset-0
            bg-gradient-to-r
            from-black/70
            via-black/30
            to-black/10
          "
        />


        {/* ====================================================
            LEFT CONTENT
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
            REGISTER CARD
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
              max-w-[500px]
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

                {/* Icon */}

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
                    backgroundColor: config.accentLight,
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


                {/* Heading */}

                <div className="flex-1">

                  <div className="flex items-center gap-2">

                    <h2 className="text-lg font-bold text-slate-900">
                      Register for Access
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

                  <p
                    className="text-xs font-semibold mt-0.5"
                    style={{
                      color: config.accent,
                    }}
                  >
                    {roleLabel} Registration
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
                  Restricted government system • Identity verification required
                </p>

              </div>

            </div>


            {/* =================================================
                CARD BODY
            ================================================== */}

            <div className="px-6 py-5">


              {/* =================================================
                  SUCCESS STATE
              ================================================== */}

              {done ? (

                <div className="text-center py-8">

                  <div
                    className="
                      w-16
                      h-16
                      rounded-full
                      mx-auto
                      flex
                      items-center
                      justify-center
                      mb-4
                    "
                    style={{
                      backgroundColor: '#DCFCE7',
                    }}
                  >

                    <CheckCircle2
                      size={34}
                      className="text-emerald-600"
                    />

                  </div>

                  <h3 className="text-lg font-bold text-slate-900">
                    Registration Submitted
                  </h3>

                  <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-sm mx-auto">
                    Your request has been sent for verification
                    by the department administrator. You will
                    receive your credentials via your registered
                    official email once approved.
                  </p>


                  <Link
                    to={`/login/${role}`}
                    className="
                      w-full
                      max-w-xs
                      h-[42px]
                      mt-6
                      mx-auto
                      rounded-lg
                      text-white
                      text-xs
                      font-bold
                      flex
                      items-center
                      justify-center
                      transition
                      hover:brightness-95
                    "
                    style={{
                      backgroundColor: config.accent,
                    }}
                  >
                    Return to Login
                  </Link>

                </div>

              ) : (

                <form
                  onSubmit={handleSubmit}
                  className="space-y-5"
                >
                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
                      <Info size={15} className="shrink-0 text-red-500" />
                      <span>{error}</span>
                    </div>
                  )}


                  {/* =================================================
                      SECTION 1 — OFFICIAL IDENTITY
                  ================================================== */}

                  <div>

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
                          Official Identity
                        </h3>

                        <p className="text-[9px] text-slate-400">
                          Verify your government identity
                        </p>

                      </div>

                    </div>


                    {/* Full Name */}

                    <div className="relative mb-3">

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
                        name="full_name"
                        required
                        className="
                          w-full
                          h-[41px]
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
                        placeholder="Full legal name"
                      />

                    </div>


                    {/* Official ID */}

                    <div className="relative">

                      <BadgeCheck
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
                        name="username"
                        required
                        className="
                          w-full
                          h-[41px]
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
                        placeholder="Official ID / Badge Number"
                      />

                    </div>

                  </div>


                  {/* =================================================
                      SECTION 2 — DEPARTMENT
                  ================================================== */}

                  <div>

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

                        <Building2
                          size={14}
                          style={{
                            color: config.accent,
                          }}
                        />

                      </div>

                      <div>

                        <h3 className="text-xs font-bold text-slate-800">
                          Department Details
                        </h3>

                        <p className="text-[9px] text-slate-400">
                          Your official organization
                        </p>

                      </div>

                    </div>


                    <div className="relative">

                      <Building2
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
                        name="department"
                        required
                        defaultValue={
                          DEPARTMENTS[normalizedRole]
                        }
                        className="
                          w-full
                          h-[41px]
                          rounded-lg
                          bg-slate-50
                          border
                          border-slate-200
                          pl-9
                          pr-3
                          text-xs
                          text-slate-800
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

                  </div>


                  {/* =================================================
                      SECTION 3 — CONTACT
                  ================================================== */}

                  <div>

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

                        <Mail
                          size={14}
                          style={{
                            color: config.accent,
                          }}
                        />

                      </div>

                      <div>

                        <h3 className="text-xs font-bold text-slate-800">
                          Official Contact
                        </h3>

                        <p className="text-[9px] text-slate-400">
                          Use your official contact details
                        </p>

                      </div>

                    </div>


                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                      {/* Email */}

                      <div className="relative">

                        <Mail
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
                          name="email"
                          type="email"
                          required
                          className="
                            w-full
                            h-[41px]
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
                          placeholder="Official email"
                        />

                      </div>


                      {/* Mobile */}

                      <div className="relative">

                        <Phone
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
                          name="phone"
                          type="tel"
                          required
                          className="
                            w-full
                            h-[41px]
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
                          placeholder="+91 Mobile Number"
                        />

                      </div>

                    </div>

                  </div>


                  {/* =================================================
                      SECTION 4 — SECURITY
                  ================================================== */}

                  <div>

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

                        <LockKeyhole
                          size={14}
                          style={{
                            color: config.accent,
                          }}
                        />

                      </div>

                      <div>

                        <h3 className="text-xs font-bold text-slate-800">
                          Account Security
                        </h3>

                        <p className="text-[9px] text-slate-400">
                          Create your secure access password
                        </p>

                      </div>

                    </div>


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
                        type="password"
                        required
                        value={password}
                        onChange={(e) =>
                          setPassword(e.target.value)
                        }
                        className="
                          w-full
                          h-[41px]
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
                        placeholder="Create password"
                      />

                    </div>


                    {/* Password strength */}

                    {password && (

                      <div className="mt-2">

                        <div className="flex justify-between mb-1">

                          <span className="text-[9px] text-slate-400">
                            Password strength
                          </span>

                          <span
                            className="text-[9px] font-semibold"
                            style={{
                              color: config.accent,
                            }}
                          >
                            {passwordStrength.label}
                          </span>

                        </div>

                        <div className="h-1 rounded-full bg-slate-100 overflow-hidden">

                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width:
                                passwordStrength.width,
                              backgroundColor:
                                config.accent,
                            }}
                          />

                        </div>

                      </div>

                    )}

                  </div>


                  {/* =================================================
                      SECURITY INFORMATION
                  ================================================== */}

                  <div
                    className="
                      flex
                      gap-2
                      rounded-lg
                      px-3
                      py-2.5
                      border
                    "
                    style={{
                      backgroundColor:
                        `${config.accentLight}55`,
                      borderColor:
                        `${config.accent}25`,
                    }}
                  >

                    <Info
                      size={15}
                      className="shrink-0 mt-0.5"
                      style={{
                        color: config.accent,
                      }}
                    />

                    <p className="text-[9px] leading-relaxed text-slate-600">
                      Registration requests are subject to
                      departmental verification. Only authorized
                      government officials will be granted access
                      to restricted records.
                    </p>

                  </div>


                  {/* =================================================
                      DECLARATION
                  ================================================== */}

                  <label
                    className="
                      flex
                      items-start
                      gap-2.5
                      text-[10px]
                      leading-relaxed
                      text-slate-500
                      cursor-pointer
                    "
                  >

                    <input
                      type="checkbox"
                      required
                      className="mt-0.5 shrink-0"
                      style={{
                        accentColor: config.accent,
                      }}
                    />

                    <span>
                      I confirm that the information provided
                      is accurate and that I am an authorized
                      government official applying for restricted
                      system access.
                    </span>

                  </label>


                  {/* =================================================
                      SUBMIT
                  ================================================== */}

                  <button
                    type="submit"
                    disabled={submitting}
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
                      backgroundColor: config.accent,
                    }}
                  >

                    {submitting && (
                      <Loader2
                        className="animate-spin"
                        size={17}
                      />
                    )}

                    {submitting
                      ? 'Submitting…'
                      : 'Submit for Verification'}

                  </button>


                  {/* =================================================
                      BACK TO LOGIN
                  ================================================== */}

                  <Link
                    to={`/login/${role}`}
                    className="
                      flex
                      items-center
                      justify-center
                      gap-1
                      text-[11px]
                      font-semibold
                      text-[#17315C]
                      hover:underline
                    "
                  >

                    <ArrowLeft size={12} />

                    Back to Login

                  </Link>

                </form>

              )}

            </div>

          </div>

        </div>

      </main>

    </div>
  )
}