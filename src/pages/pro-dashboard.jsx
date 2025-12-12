import React from 'react'
import ProHeader from '../components/ProHeader'
import ProBadge from '../components/ProBadge'
import Button from '../components/ui/button.jsx'

export default function ProDashboard() {
  return (
    <div className="min-h-screen bg-slate-50">
      <ProHeader />

      <main className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <section className="bg-white rounded-xl shadow-md p-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900">Pro Dashboard <span className="ml-2"><ProBadge size="lg"/></span></h1>
              <p className="mt-2 text-slate-600">Premium analytics, higher limits, and priority AI access for power users.</p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => alert('Contact sales')}>Contact Sales</Button>
              <Button variant="primary" onClick={() => alert('Upgrade flow')}>Upgrade Now</Button>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 bg-gradient-to-b from-white to-slate-50 rounded-lg border border-slate-100">
              <h3 className="text-lg font-semibold">Priority AI</h3>
              <p className="mt-2 text-sm text-slate-600">Faster, higher-quality AI responses with dedicated concurrency.</p>
            </div>

            <div className="p-6 bg-gradient-to-b from-white to-slate-50 rounded-lg border border-slate-100">
              <h3 className="text-lg font-semibold">Unlimited Storage</h3>
              <p className="mt-2 text-sm text-slate-600">Store more media and game replay history for longer.</p>
            </div>

            <div className="p-6 bg-gradient-to-b from-white to-slate-50 rounded-lg border border-slate-100">
              <h3 className="text-lg font-semibold">Team Sharing</h3>
              <p className="mt-2 text-sm text-slate-600">Invite collaborators and share dashboards securely.</p>
            </div>
          </div>

          <div className="mt-8 text-sm text-slate-500">Pro features are early previews — billing and entitlement logic is not included in this scaffold.</div>
        </section>
      </main>
    </div>
  )
}
