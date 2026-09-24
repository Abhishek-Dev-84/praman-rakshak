import { useState } from 'react'
import { FileText, ChevronRight, Scale } from 'lucide-react'
import { PageHeader, Tabs } from '../../components/common/Controls'
import { useUI } from '../../context/UIContext'

const STATUTORY_TEMPLATES = [
  {
    id: 'crpc_173',
    title: 'CrPC 173 Final Chargesheet Template',
    desc: 'Standard statutory police final report and prosecution submission format.',
    sections: 'BNS / CrPC 173(2)',
  },
  {
    id: 'bail_opposition',
    title: 'Bail Opposition & Grounds Memorandum',
    desc: 'Pleading template opposing regular/anticipatory bail with evidence integrity citations.',
    sections: 'BNSS / CrPC 437/439',
  },
  {
    id: 'bsa_65b',
    title: 'Section 65B BSA Electronic Evidence Certificate',
    desc: 'Mandatory statutory certificate certifying hash integrity and source authenticity.',
    sections: 'BSA 65B / IEA 65B',
  },
  {
    id: 'search_warrant',
    title: 'Search Warrant & Seizure Memo Format',
    desc: 'Magisterial application for search and seizure of digital storage devices.',
    sections: 'BNSS / CrPC 93/100',
  },
]

const STATUTORY_CLAUSES = [
  {
    id: 'chain_clause',
    title: 'Chain of Custody Sanctity Affidavit Clause',
    desc: 'Affidavit paragraph confirming continuous seal integrity and zero tamper access.',
    sections: 'Evidence Act § 65',
  },
  {
    id: 'forensic_hash_clause',
    title: 'Forensic Bit-Stream Image & Hash Certification',
    desc: 'Declaration of SHA-256 integrity match between seized device and master image.',
    sections: 'IT Act § 79A',
  },
  {
    id: 'urgency_memo',
    title: 'Urgent Judicial Production & Vault Custody Clause',
    desc: 'Application clause requesting urgent deposit into high-security judicial malkhana.',
    sections: 'Rules of Court',
  },
]

export default function LegalTemplates() {
  const [tab, setTab] = useState('templates')
  const { pushToast } = useUI()
  const list = tab === 'templates' ? STATUTORY_TEMPLATES : STATUTORY_CLAUSES

  return (
    <div>
      <PageHeader title="Legal Templates & Statutory Formats" subtitle="Approved prosecution document templates aligned with Bharatiya Sakshya Adhiniyam" />

      <div className="card p-4 mb-4">
        <Tabs
          tabs={[
            { value: 'templates', label: 'Statutory Templates' },
            { value: 'clauses', label: 'Evidentiary Clauses' },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      <p className="text-xs font-semibold text-slate-400 uppercase mb-2">
        {tab === 'templates' ? 'Statutory Pleading Templates' : 'Standard Evidentiary Clauses'}
      </p>
      <div className="card p-4 divide-y divide-slate-100">
        {list.map((item) => (
          <button
            key={item.id}
            onClick={() => pushToast({ type: 'success', title: 'Template Loaded', message: `${item.title} ready for drafting.` })}
            className="w-full flex items-center justify-between py-3.5 text-left hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-forest-50 p-2 text-forest-700 shrink-0">
                <FileText size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-navy-800">{item.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-mono font-semibold text-forest-700 bg-forest-50 px-2 py-0.5 rounded border border-forest-200">
                {item.sections}
              </span>
              <ChevronRight size={16} className="text-slate-300" />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
