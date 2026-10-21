import { useState } from 'react'
import supervisorMaheshi from '../assets/images/supervisor_maheshi.png'
import developerAnna from '../assets/images/developer_anna.png'
import developerNamidu from '../assets/images/developer_namidu.png'
import Ornament from './Ornament'

type Member = {
  name: string
  role: string
  email: string
  department: string
  photo: string
  featured?: boolean
}

const team: Member[] = [
  {
    name: 'Prof. Maheshi B. Dissanayake',
    role: 'Supervisor',
    email: 'maheshid@eng.pdn.ac.lk',
    department: 'Department of Electrical & Electronic Engineering, University of Peradeniya',
    photo: supervisorMaheshi,
    featured: true,
  },
  {
    name: 'Anna Kurera',
    role: 'Developer',
    email: 'anna.kurera@gmail.com',
    department: 'Department of Computer Engineering, University of Peradeniya',
    photo: developerAnna,
  },
  {
    name: 'Namidu S. Wickamanayaka',
    role: 'Developer',
    email: 'n.s.wick.303@gmail.com',
    department: 'Department of Computer Engineering, University of Peradeniya',
    photo: developerNamidu,
  },
]

function Avatar({ src, name, featured }: { src: string; name: string; featured?: boolean }) {
  const [failed, setFailed] = useState(false)

  return (
    <div
      className={`mx-auto w-fit rounded-[50%] border p-1.5 ${
        featured ? 'border-bronze' : 'border-rule'
      }`}
    >
      <div
        className={`overflow-hidden rounded-[50%] bg-linen ${
          featured ? 'h-48 w-[9.5rem]' : 'h-40 w-32'
        }`}
      >
        {failed ? (
          <div className="flex h-full w-full items-center justify-center text-bronze-light">
            <svg viewBox="0 0 24 24" className="h-14 w-14" fill="currentColor" aria-hidden="true">
              <path d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12Zm0 2c-4.2 0-8 2.1-8 5v1h16v-1c0-2.9-3.8-5-8-5Z" />
            </svg>
          </div>
        ) : (
          <img
            src={src}
            alt={name}
            className="h-full w-full object-cover"
            onError={() => setFailed(true)}
          />
        )}
      </div>
    </div>
  )
}

function MemberEntry({ member }: { member: Member }) {
  return (
    <article className="px-4 text-center sm:px-8">
      <Avatar src={member.photo} name={member.name} featured={member.featured} />
      <h3 className="mt-6 font-serif text-2xl font-medium leading-snug text-ink">{member.name}</h3>
      <p className="mt-1 text-lg italic text-bronze">{member.role}</p>
      <p className="mx-auto mt-3 max-w-xs text-base leading-relaxed text-ink-soft">
        {member.department}
      </p>
      <a
        href={`mailto:${member.email}`}
        className="mt-4 inline-flex items-center gap-2 text-base text-ink-soft underline decoration-rule underline-offset-4 transition-colors [overflow-wrap:anywhere] hover:text-bronze hover:decoration-bronze"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path strokeLinejoin="round" d="m4 7 8 6 8-6" />
        </svg>
        {member.email}
      </a>
    </article>
  )
}

export default function TeamSection() {
  const leads = team.filter((member) => member.featured)
  const others = team.filter((member) => !member.featured)

  return (
    <section className="bg-paper py-16 sm:py-24">
      <div className="mx-auto max-w-5xl px-6 sm:px-8">
        <div className="text-center">
          <h2 className="font-serif text-[2rem] font-medium leading-tight text-ink sm:text-[2.5rem]">
            The Team
          </h2>
          <p className="mt-3 text-lg text-ink-soft">Researchers and developers behind this project.</p>
        </div>

        <div className="mt-14 space-y-12">
          {leads.map((member) => (
            <MemberEntry key={member.email} member={member} />
          ))}

          <Ornament />

          <div className="mx-auto grid max-w-3xl gap-12 sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-rule">
            {others.map((member) => (
              <MemberEntry key={member.email} member={member} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
