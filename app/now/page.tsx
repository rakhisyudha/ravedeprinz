import { Page } from '../../components/Page';

export default function Now() {
  return (
    <Page eyebrow="LIVE READOUT / 006" title="NOW" intro="A short look at what has my attention at the moment.">
      <div className="panel cut grid-bg relative overflow-hidden p-5 sm:p-12">
        <div className="absolute right-5 top-5 h-3 w-3 animate-pulse bg-[#FFC54A] sm:right-8 sm:top-8" />
        <div className="grid gap-10 lg:grid-cols-[1fr_250px] lg:gap-12">
          <div>
            <p className="eyebrow mb-6">PRIMARY OBJECTIVE / 01</p>
            <h2 className="display max-w-2xl break-words text-5xl font-bold leading-[0.88] sm:text-8xl">
              BUILDING<br />
              <span className="text-[#00BBFA]">A CRM PLATFORM</span>
            </h2>
            <p className="mt-8 max-w-xl text-base leading-8 text-[#b4d0dc]">
              I am working as a backend intern at Radius Data Solusi. I am helping build a CRM in Go with Gin while learning more about API design, authentication, and database structure. The goal is simple software that stays dependable as it grows.
            </p>
          </div>
          <div className="border-t border-[#00BBFA]/40 pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <p className="eyebrow">SYSTEM STATUS</p>
            <dl className="mono mt-7 space-y-6 text-xs">
              <div>
                <dt className="text-[#7099ac]">FOCUS</dt>
                <dd className="mt-1 text-[#e8f7ff]">SHIP THE CRM</dd>
              </div>
              <div>
                <dt className="text-[#7099ac]">LEARNING</dt>
                <dd className="mt-1 text-[#e8f7ff]">GO · GIN · DOCKER</dd>
              </div>
              <div>
                <dt className="text-[#7099ac]">ENERGY</dt>
                <dd className="mt-1 text-[#FFC54A]">███████░░░ 72%</dd>
              </div>
            </dl>
          </div>
        </div>
        <div className="gold-line mt-10 sm:mt-14" />
        <p className="mono mt-5 break-words text-[10px] tracking-wider text-[#79D7FD]">LAST UPDATED // 26.08.2026 · 09:42 UTC</p>
      </div>
    </Page>
  );
}
