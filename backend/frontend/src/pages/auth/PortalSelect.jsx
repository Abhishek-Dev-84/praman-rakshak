import { Link } from 'react-router-dom'
import {
  Landmark,
  Scale,
  Search,
  Gavel,
  Shield,
  Briefcase,
  Lock,
  FileCheck2,
  Users2,
  ShieldCheck,
  Fingerprint,
  BarChart3,
  ArrowRight,
} from 'lucide-react'

import { ROLES, ROLE_LABELS } from '../../utils/constants'
import heroImg from '../../assets/hero-parliament.jpg'

/* =========================================================
   ROLE CARDS
========================================================= */

const ROLE_CARDS = [
  {
    role: ROLES.ADMIN,
    icon: Briefcase,
    name: ROLE_LABELS[ROLES.ADMIN],
    desc: 'System administration, user management, configuration & monitoring',
    accent: '#B17A16',
    hover: '#946512',
    featured: true,
  },
  {
    role: ROLES.POLICE,
    icon: Shield,
    name: ROLE_LABELS[ROLES.POLICE],
    desc: 'Manage FIRs, case files, evidence & reports',
    accent: '#0848A8',
    hover: '#063A88',
  },
  {
    role: ROLES.INVESTIGATOR,
    icon: Search,
    name: ROLE_LABELS[ROLES.INVESTIGATOR],
    desc: 'Manage investigations, collect evidence & build case files',
    accent: '#078A59',
    hover: '#06714A',
  },
  {
    role: ROLES.LEGAL_OFFICER,
    icon: Scale,
    name: ROLE_LABELS[ROLES.LEGAL_OFFICER],
    desc: 'Review legal documents, filings & case proceedings',
    accent: '#6330A8',
    hover: '#51278A',
  },
  {
    role: ROLES.JUDGE,
    icon: Gavel,
    name: ROLE_LABELS[ROLES.JUDGE],
    desc: 'Access judicial documents, dockets, orders & hearings',
    accent: '#994909',
    hover: '#7C3B07',
  },
]

/* =========================================================
   HERO SECURITY FEATURES
========================================================= */

const SECURITY_FEATURES = [
  {
    icon: Lock,
    title: 'Secure',
    desc: 'End-to-end encryption',
  },
  {
    icon: FileCheck2,
    title: 'Traceable',
    desc: 'Complete audit trail',
  },
  {
    icon: Users2,
    title: 'Unified',
    desc: 'Role-based access',
  },
  {
    icon: ShieldCheck,
    title: 'Trusted',
    desc: 'Built for a safer India',
  },
]

/* =========================================================
   FOOTER FEATURES
========================================================= */

const FOOTER_FEATURES = [
  {
    icon: FileCheck2,
    title: 'Document Integrity',
    desc: 'Blockchain-backed records',
  },
  {
    icon: Fingerprint,
    title: 'Biometric Verification',
    desc: 'Multi-factor authentication',
  },
  {
    icon: Users2,
    title: 'Role-Based Access',
    desc: 'Controlled permissions',
  },
  {
    icon: BarChart3,
    title: 'Audit & Compliance',
    desc: 'Complete activity logs',
  },
]

/* =========================================================
   ROLE CARD
========================================================= */

function RoleCard({ role }) {
  const Icon = role.icon

  return (
    <article
      className="
        flex
        h-[239px]
        flex-col
        rounded-[11px]
        bg-white
        px-[14px]
        py-[16px]
        text-center
        shadow-[0_3px_12px_rgba(7,29,65,0.07)]
        transition-all
        duration-200
        hover:-translate-y-[2px]
        hover:shadow-[0_10px_25px_rgba(7,29,65,0.14)]
      "
      style={{
        border: role.featured
          ? `2px solid ${role.accent}`
          : '1px solid #DCE4EE',

        backgroundColor: role.featured
          ? `${role.accent}08`
          : '#FFFFFF',
      }}
    >
      {/* Icon */}

      <div
        className="
          mx-auto
          flex
          h-[52px]
          w-[52px]
          shrink-0
          items-center
          justify-center
          rounded-full
        "
        style={{
          backgroundColor: `${role.accent}14`,
        }}
      >
        <Icon
          size={29}
          strokeWidth={1.65}
          style={{
            color: role.accent,
          }}
        />
      </div>

      {/* Role name */}

      <h3
        className="
          mt-[10px]
          text-[18px]
          font-bold
          leading-tight
          text-[#071D41]
        "
      >
        {role.name}
      </h3>

      {/* Description */}

      <p
        className="
          mx-auto
          mt-[8px]
          max-w-[215px]
          flex-1
          text-[13px]
          leading-[1.35]
          text-[#52667F]
        "
      >
        {role.desc}
      </p>

      {/* Login */}

      <Link
        to={`/login/${role.role}`}
        className="
          mt-[11px]
          flex
          h-[45px]
          w-full
          items-center
          justify-center
          gap-2
          rounded-[8px]
          text-[13px]
          font-bold
          text-white
          transition-all
          duration-200
          focus:outline-none
        "
        style={{
          backgroundColor: role.accent,
        }}
        onMouseEnter={(event) => {
          event.currentTarget.style.backgroundColor = role.hover
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.backgroundColor = role.accent
        }}
      >
        <span>
          Login as {role.name}
        </span>

        <ArrowRight
          size={15}
          strokeWidth={2.3}
        />
      </Link>
    </article>
  )
}

/* =========================================================
   FOOTER BUILDING
========================================================= */

function BuildingSilhouette() {
  return (
    <svg
      viewBox="0 0 520 200"
      className="
        pointer-events-none
        absolute
        bottom-0
        left-0
        hidden
        h-full
        w-auto
        opacity-[0.10]
        md:block
      "
      fill="currentColor"
      aria-hidden="true"
    >
      <polygon points="40,90 220,20 400,90" />

      <rect x="50" y="90" width="24" height="90" />
      <rect x="100" y="90" width="24" height="90" />
      <rect x="150" y="90" width="24" height="90" />
      <rect x="196" y="90" width="24" height="90" />
      <rect x="242" y="90" width="24" height="90" />
      <rect x="292" y="90" width="24" height="90" />
      <rect x="342" y="90" width="24" height="90" />

      <rect x="20" y="178" width="400" height="12" />
    </svg>
  )
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function PortalSelect() {
  return (
    <div className="min-h-screen w-full bg-[#061733] font-sans">

      {/* =====================================================
          DESKTOP HERO
          Desktop composition with lowered role panel = 1536 × 900
      ====================================================== */}

      <section
        className="
          relative
          h-auto
          overflow-hidden
          bg-[#F7F3EB]

          min-[1200px]:h-[930px]
        "
      >

        {/* ===================================================
            PARLIAMENT IMAGE

            IMPORTANT:
            This is deliberately NOT object-center.

            The source photograph is stretched vertically
            and shifted upward so that the Parliament roof,
            flag and sign line up with the supplied wireframe.
        ==================================================== */}

       <div
          className="
            absolute
            inset-0
            overflow-hidden
          "
        >
          <img
            src={heroImg}
            alt="Parliament of India"
            className="
              absolute
              inset-0
              h-full
              w-full
              object-fill
            "
          />

          {/* Left-side readability overlay */}
          <div
            className="
              pointer-events-none
              absolute
              inset-0
              bg-[linear-gradient(90deg,rgba(255,253,249,0.88)_0%,rgba(255,253,249,0.66)_25%,rgba(255,253,249,0.28)_43%,rgba(255,253,249,0.06)_58%,rgba(255,253,249,0)_72%)]
            "
          />
        </div>
        {/* ===================================================
            MOBILE / TABLET IMAGE
        ==================================================== */}

        <div
          className="
            absolute
            inset-0
            overflow-hidden
            min-[1200px]:hidden
          "
        >
          <img
            src={heroImg}
            alt="Parliament of India"
            className="
              absolute
              inset-0
              h-full
              w-full
              object-cover
              object-[62%_50%]
            "
          />
        </div>

        {/* ===================================================
            MAIN LIGHT GRADIENT

            Keeps the left side clean for typography while
            preserving the Parliament image on the right.
        ==================================================== */}

        <div
          className="
            pointer-events-none
            absolute
            inset-0
            bg-[linear-gradient(90deg,rgba(255,253,249,0.93)_0%,rgba(255,253,249,0.78)_24%,rgba(255,253,249,0.42)_43%,rgba(255,253,249,0.10)_61%,rgba(255,253,249,0)_76%)]
          "
        />

        {/* ===================================================
            HEADER
        ==================================================== */}

        <header
          className="
            absolute
            left-0
            right-0
            top-0
            z-40
            h-[140px]
            border-b
            border-white/10
            bg-white/5
          "
        >
          <div
            className="
              mx-auto
              flex
              h-full
              max-w-[1536px]
              items-start
              justify-between
              px-6
              pt-[22px]
              sm:px-8
              lg:px-10
              min-[1200px]:px-[80px]
            "
          >

            {/* =================================================
                LEFT GOVERNMENT BRAND
            ================================================== */}

            <div className="flex items-start">

              {/* Emblem */}

              <div
                className="
                  flex
                  h-[60px]
                  w-[60px]
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  border-2
                  border-[#B17A16]
                  bg-white/40
                "
              >
                <Landmark
                  size={30}
                  strokeWidth={1.55}
                  className="text-[#071D41]"
                />
              </div>

              {/* Ministry text */}

              <div className="ml-[16px] pt-[4px]">
                <p
                  className="
                    whitespace-nowrap
                    text-[18px]
                    font-bold
                    leading-tight
                    text-[#071D41]
                  "
                >
                  Ministry of Home Affairs
                </p>

                <p
                  className="
                    mt-[4px]
                    text-[14px]
                    leading-tight
                    text-[#183657]
                  "
                >
                  Government of India
                </p>
              </div>

              {/* Divider */}

              <div
                className="
                  mx-[28px]
                  mt-[2px]
                  hidden
                  h-[76px]
                  w-px
                  bg-[#071D41]/25
                  lg:block
                "
              />

              {/* Government message */}

              <div className="hidden pt-[5px] lg:block">
                <p className="text-[12px] leading-[1.35] text-[#36506F]">
                  Safer Citizens
                </p>

                <p className="text-[12px] leading-[1.35] text-[#36506F]">
                  Stronger Institutions
                </p>

                <p className="text-[12px] leading-[1.35] text-[#36506F]">
                  A Secure India
                </p>

                <div
                  className="
                    mt-[7px]
                    h-[3px]
                    w-[105px]
                    rounded-full
                    bg-gradient-to-r
                    from-orange-500
                    via-white
                    to-emerald-600
                  "
                />
              </div>
            </div>

            {/* =================================================
                RIGHT BRAND
            ================================================== */}

            <div className="flex items-start">

              {/* SecureDocs */}

              <div className="flex items-center pt-[4px]">

                <Shield
                  size={42}
                  strokeWidth={1.55}
                  className="text-[#071D41]"
                />

                <div className="ml-[11px]">
                  <p
                    className="
                      whitespace-nowrap
                      text-[19px]
                      font-extrabold
                      leading-tight
                      text-[#071D41]
                    "
                  >
                    Secure
                    <span className="text-[#B17A16]">
                      Docs
                    </span>
                  </p>

                  <p
                    className="
                      mt-[5px]
                      whitespace-nowrap
                      text-[9px]
                      font-semibold
                      tracking-[0.055em]
                      text-[#52667F]
                    "
                  >
                    JUDICIAL DOCUMENT MANAGEMENT SYSTEM
                  </p>
                </div>
              </div>

              {/* Divider */}

              <div
                className="
                  mx-[30px]
                  mt-[2px]
                  hidden
                  h-[80px]
                  w-px
                  bg-[#071D41]/20
                  xl:block
                "
              />

              {/* Trust */}

              <div className="hidden text-right xl:block">
                <p className="text-[10px] font-semibold tracking-[0.25em] text-[#36506F]">
                  TRUST
                </p>

                <p className="text-[10px] font-semibold tracking-[0.25em] text-[#36506F]">
                  INTEGRITY
                </p>

                <p className="text-[10px] font-semibold tracking-[0.25em] text-[#36506F]">
                  JUSTICE
                </p>

                <p className="text-[10px] font-semibold tracking-[0.19em] text-[#36506F]">
                  FOR A SAFER INDIA
                </p>

                <div
                  className="
                    ml-auto
                    mt-[7px]
                    h-[3px]
                    w-[64px]
                    rounded-full
                    bg-[#B17A16]
                  "
                />
              </div>
            </div>
          </div>
        </header>

        {/* ===================================================
            HERO CONTENT

            Desktop coordinates are intentionally anchored
            to the supplied 1536 × 1024 wireframe.
        ==================================================== */}

        <div
          className="
            relative
            z-10
            mx-auto
            max-w-[1536px]
            px-6
            pt-[160px]
            sm:px-8
            lg:px-10

            min-[1200px]:absolute
            min-[1200px]:left-0
            min-[1200px]:right-0
            min-[1200px]:top-0
            min-[1200px]:px-[80px]
            min-[1200px]:pt-[157px]
          "
        >

          {/* Eyebrow */}

          <p
            className="
              text-[10px]
              font-semibold
              tracking-[0.30em]
              text-[#52667F]
            "
          >
            OFFICIAL GOVERNMENT SYSTEM
          </p>

          {/* Main title */}

          <h1
            className="
              mt-[15px]
              max-w-[650px]
              font-serif
              text-[43px]
              font-bold
              leading-[0.98]
              tracking-[-0.025em]
              text-[#071D41]

              sm:text-[48px]
              lg:text-[51px]

              min-[1200px]:text-[54px]
            "
          >
            <span className="block whitespace-nowrap">
              Secure{' '}
              <span className="text-[#B17A16]">
                Digital
              </span>
            </span>

            <span className="block whitespace-nowrap">
              Document Management
            </span>
          </h1>

          {/* Description */}

          <p
            className="
              mt-[18px]
              max-w-[515px]
              font-serif
              text-[17px]
              leading-[1.42]
              text-[#183657]

              sm:text-[18px]
              min-[1200px]:text-[19px]
            "
          >
            A unified, secure and tamper-proof platform for legal
            and investigation documents.
          </p>

          {/* =================================================
              SECURITY FEATURES
          ================================================== */}

          <div
            className="
              mt-[27px]
              flex
              items-stretch
            "
          >
            {SECURITY_FEATURES.map((item, index) => {
              const Icon = item.icon

              return (
                <div
                  key={item.title}
                  className={`
                    flex
                    w-[118px]
                    flex-col
                    items-center
                    text-center
                    ${
                      index !== 0
                        ? 'border-l border-[#071D41]/15'
                        : ''
                    }
                  `}
                >
                  <div
                    className="
                      flex
                      h-[48px]
                      w-[48px]
                      items-center
                      justify-center
                      rounded-full
                      border
                      border-[#9FB4CF]
                      bg-white/45
                    "
                  >
                    <Icon
                      size={21}
                      strokeWidth={1.65}
                      className="text-[#071D41]"
                    />
                  </div>

                  <p
                    className="
                      mt-[8px]
                      text-[12px]
                      font-bold
                      leading-tight
                      text-[#071D41]
                    "
                  >
                    {item.title}
                  </p>

                  <p
                    className="
                      mt-[2px]
                      max-w-[94px]
                      text-[9px]
                      leading-[1.3]
                      text-[#52667F]
                    "
                  >
                    {item.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* ===================================================
            ROLE PANEL

            EXACT DESKTOP TARGET:
            x ≈ 79
            y ≈ 590
            width ≈ 1378
            height ≈ 340
        ==================================================== */}

        <section
          className="
            relative
            z-20
            mx-4
            mt-8
            rounded-t-[20px]
            border
            border-white/90
            bg-white
            shadow-[0_-8px_32px_rgba(7,29,65,0.14)]

            min-[1200px]:absolute
            min-[1200px]:left-1/2
            min-[1200px]:top-[590px]
            min-[1200px]:z-30
            min-[1200px]:m-0
            min-[1200px]:h-[340px]
            min-[1200px]:w-[calc(100%-158px)]
            min-[1200px]:max-w-[1378px]
            min-[1200px]:-translate-x-1/2
          "
        >
          <div
            className="
              h-full
              px-[18px]
              py-[18px]

              sm:px-[24px]

              min-[1200px]:px-[24px]
              min-[1200px]:py-[18px]
            "
          >

            {/* Panel heading */}

            <div
              className="
                mb-[18px]
                flex
                items-start
                justify-between
                gap-4
              "
            >
              <div>
                <h2
                  className="
                    font-serif
                    text-[27px]
                    font-bold
                    leading-tight
                    text-[#071D41]
                  "
                >
                  Choose Your Role
                </h2>

                <div
                  className="
                    mt-[7px]
                    h-[3px]
                    w-[44px]
                    rounded-full
                    bg-[#B17A16]
                  "
                />
              </div>

              {/* Authorization */}

              <div className="flex items-center gap-[8px]">
                <Lock
                  size={17}
                  strokeWidth={1.55}
                  className="text-[#8CA0BC]"
                />

                <div className="text-right">
                  <p
                    className="
                      text-[12px]
                      font-bold
                      leading-tight
                      text-[#183657]
                    "
                  >
                    Authorized Personnel Only
                  </p>

                  <p
                    className="
                      mt-[3px]
                      text-[10px]
                      leading-tight
                      text-[#8CA0BC]
                    "
                  >
                    All access is logged and monitored
                  </p>
                </div>
              </div>
            </div>

            {/* =================================================
                FIVE ROLE CARDS
            ================================================== */}

            <div
              className="
                grid
                grid-cols-1
                gap-4

                sm:grid-cols-2
                md:grid-cols-3
                lg:grid-cols-5

                min-[1200px]:gap-[14px]
              "
            >
              {ROLE_CARDS.map((role) => (
                <RoleCard
                  key={role.role}
                  role={role}
                />
              ))}
            </div>
          </div>
        </section>
      </section>

      {/* =====================================================
          FEATURE STRIP

          Desktop target ≈ 106px
      ====================================================== */}

      <section
        className="
          relative
          min-h-[106px]
          overflow-hidden
          bg-[#071D41]
        "
      >
        <BuildingSilhouette />

        <div
          className="
            relative
            z-10
            mx-auto
            flex
            min-h-[106px]
            max-w-[1536px]
            items-center
            px-6

            sm:px-8
            lg:px-10
            min-[1200px]:px-[64px]
          "
        >
          <div
            className="
              grid
              w-full
              grid-cols-2
              md:grid-cols-4
            "
          >
            {FOOTER_FEATURES.map((feature, index) => {
              const Icon = feature.icon

              return (
                <div
                  key={feature.title}
                  className={`
                    flex
                    items-center
                    gap-[12px]
                    px-3
                    lg:px-[20px]

                    ${
                      index !== 0
                        ? 'border-l border-white/20'
                        : ''
                    }
                  `}
                >
                  <Icon
                    size={31}
                    strokeWidth={1.5}
                    className="shrink-0 text-white"
                  />

                  <div className="min-w-0">
                    <p
                      className="
                        whitespace-nowrap
                        text-[12px]
                        font-bold
                        leading-tight
                        text-white
                        lg:text-[13px]
                      "
                    >
                      {feature.title}
                    </p>

                    <p
                      className="
                        mt-[4px]
                        hidden
                        whitespace-nowrap
                        text-[10px]
                        leading-tight
                        text-white/55
                        lg:block
                      "
                    >
                      {feature.desc}
                    </p>
                  </div>
                </div>
              )
            })}

            {/* Digital India */}

            <div
              className="
                hidden
                items-center
                justify-end
                border-l
                border-white/20
                pl-5
                2xl:flex
              "
            >
              <div className="text-right">
                <p
                  className="
                    text-[17px]
                    font-bold
                    italic
                    text-white
                  "
                >
                  Digital India
                </p>

                <p
                  className="
                    text-[8px]
                    tracking-[0.10em]
                    text-white/50
                  "
                >
                  POWER TO EMPOWER
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          BOTTOM LEGAL BAR

          Desktop target ≈ 60px
      ====================================================== */}

      <footer
        className="
          min-h-[60px]
          bg-[#061733]
        "
      >
        <div
          className="
            mx-auto
            flex
            min-h-[60px]
            max-w-[1536px]
            flex-col
            items-center
            justify-center
            gap-2
            px-6
            text-[10px]
            text-white/55

            sm:px-8

            lg:flex-row
            lg:justify-between
            lg:px-10

            min-[1200px]:px-[50px]
          "
        >
          <p>
            © 2024 Ministry of Home Affairs,
            Government of India. All rights reserved.
          </p>

          <nav className="flex items-center gap-4">
            <span>Privacy</span>

            <span className="text-white/20">
              |
            </span>

            <span>Terms</span>

            <span className="text-white/20">
              |
            </span>

            <span>Help</span>

            <span className="text-white/20">
              |
            </span>

            <span>Contact</span>
          </nav>
        </div>
      </footer>
    </div>
  )
}
