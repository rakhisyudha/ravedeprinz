import { Page } from '../../components/Page';
import { skills } from '../../data/content';
import Image from 'next/image';
import aboutImage from '../../img/Profile/ini.jpeg';

export default function About() {
  return (
    <Page eyebrow="IDENTITY / 002" title="ABOUT" intro="I build full-stack products with a strong interest in the systems underneath them.">
      <div className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
        <article className="panel cut p-7 sm:p-10">
          <div className="grid gap-8 md:grid-cols-[220px_1fr] md:items-start lg:grid-cols-[260px_1fr]">
            <div>
              <p className="eyebrow mb-6">01 / THE SHORT VERSION</p>
              <div className="image-frame cut-small about-image-frame relative h-[320px] w-full overflow-hidden sm:h-[390px]">
                <Image src={aboutImage} alt="Rakhis de Yudha" fill className="object-cover" sizes="(max-width: 768px) 100vw, 260px" />
                <div className="absolute left-0 top-0 h-8 w-8 border-l-2 border-t-2 border-[#00BBFA]" />
                <div className="absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2 border-[#FFC54A]" />
              </div>
            </div>
            <div className="md:pt-10">
              <p className="max-w-2xl text-xl leading-9 text-[#e8f7ff]">
                I’m Rakhis de Yudha. I study computer science and build full-stack products with a backend focus. I like work that is clear, useful, and built to last.
              </p>
              <p className="mt-7 max-w-2xl leading-8 text-[#9abaca]">
                I work with Go, PostgreSQL, React, Vue, Docker, and CI/CD. My strongest area is backend development. I have built production systems with Go, Gin, PostgreSQL, Redis, authentication, file storage, and deployment infrastructure.
              </p>
              <div className="gold-line mt-10 max-w-xs" />
            </div>
          </div>
        </article>

        <section className="panel cut flex h-full flex-col p-7">
          <p className="eyebrow mb-7">02 / SKILL PANEL</p>
          <div className="space-y-6">
            {skills.map((cat) => (
              <div key={cat.category}>
                <p className="mono mb-3 text-[10px] tracking-widest text-[#00BBFA]">{cat.category.toUpperCase()}</p>
                <ul className="space-y-2">
                  {cat.skills.map((skill) => (
                    <li key={skill} className="border-b border-[#79D7FD]/10 pb-2 text-sm">{skill}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-auto pt-8">
            <div className="gold-line mb-4" />
            <p className="mono text-[10px] tracking-widest text-[#79D7FD]">STATUS: ACTIVELY BUILDING</p>
          </div>
        </section>
      </div>
    </Page>
  );
}
