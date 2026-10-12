'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  Activity,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpLeft,
  Bot,
  ChevronDown,
  CircleHelp,
  Download,
  FileKey2,
  Gauge,
  LayoutDashboard,
  Menu,
  Moon,
  MoreHorizontal,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Ticket,
  Users,
  X,
} from 'lucide-react'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface UserProfile {
  id: string
  full_name: string
  email: string
  username: string
  department: string
  role: string
  is_approved: boolean
  password?: string
}

const UNASSIGNED_DEPT = 'غير محدد'

const DEPARTMENT_AR: Record<string, string> = {
  hr: 'الموارد البشرية',
  'human resources': 'الموارد البشرية',
  finance: 'المالية',
  it: 'تقنية المعلومات',
  'information technology': 'تقنية المعلومات',
  operations: 'العمليات',
  ops: 'العمليات',
  marketing: 'التسويق',
  sales: 'المبيعات',
  admin: 'الإدارة',
  administration: 'الإدارة',
}

function normalizeArabic(value?: string | null) {
  return (value ?? '')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim()
}

function departmentLabel(value?: string | null) {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return UNASSIGNED_DEPT
  const mapped = DEPARTMENT_AR[normalizeArabic(trimmed).toLowerCase()]
  return mapped || trimmed
}

function departmentsMatch(a?: string | null, b?: string | null) {
  return normalizeArabic(departmentLabel(a)) === normalizeArabic(departmentLabel(b))
}

function roleLabel(role?: string | null) {
  if (role === 'admin') return 'مدير نظام'
  if (role === 'manager') return 'رئيس قسم'
  if (role === 'agent') return 'فني دعم'
  return 'مستخدم'
}

function initialsOf(name?: string | null) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'م'
  if (parts.length === 1) return parts[0].slice(0, 2)
  return `${parts[0][0]}${parts[1][0]}`
}

export default function Page() {
  const [dark, setDark] = useState(true)
  const [menu, setMenu] = useState(false)
  const [activeTab, setActiveTab] = useState('نظرة عامة')
  const [department, setDepartment] = useState('الكل')
  const [query, setQuery] = useState('')
  const [copilotQuery, setCopilotQuery] = useState('')
  const [copilotReply, setCopilotReply] = useState('')

  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  const fetchUsers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true })

    if (!error && data) {
      setUsers(data as UserProfile[])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const toggleApproval = async (id: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus
    setSavingId(id)
    setUsers((prev) =>
      prev.map((person) =>
        person.id === id ? { ...person, is_approved: nextStatus } : person
      )
    )

    const { error } = await supabase
      .from('profiles')
      .update({ is_approved: nextStatus })
      .eq('id', id)

    if (error) {
      setUsers((prev) =>
        prev.map((person) =>
          person.id === id ? { ...person, is_approved: currentStatus } : person
        )
      )
      alert('حدث خطأ أثناء تحديث حالة الاعتماد')
    }

    setSavingId(null)
  }

  const dynamicDepartments = useMemo(() => {
    const byKey = new Map<string, string>()
    users.forEach((person) => {
      const label = departmentLabel(person.department)
      const key = normalizeArabic(label)
      if (!byKey.has(key)) byKey.set(key, label)
    })
    return ['الكل', ...Array.from(byKey.values())]
  }, [users])

  useEffect(() => {
    if (department !== 'الكل' && !dynamicDepartments.includes(department)) {
      setDepartment('الكل')
    }
  }, [department, dynamicDepartments])

  const filtered = useMemo(() => {
    const searchQuery = query.toLowerCase().trim()

    return users.filter((person) => {
      if (activeTab === 'الاعتمادات' && person.is_approved) return false

      const matchDept =
        department === 'الكل' || departmentsMatch(person.department, department)

      const matchSearch =
        !searchQuery ||
        person.full_name?.toLowerCase().includes(searchQuery) ||
        person.email?.toLowerCase().includes(searchQuery) ||
        person.username?.toLowerCase().includes(searchQuery) ||
        departmentLabel(person.department).toLowerCase().includes(searchQuery)

      return matchDept && matchSearch
    })
  }, [users, department, query, activeTab])

  const exportCsv = () => {
    const csv = [
      'الاسم,اسم المستخدم,البريد,القسم,الدور,الحالة',
      ...filtered.map((person) =>
        [
          `"${person.full_name ?? ''}"`,
          `"${person.username ?? ''}"`,
          `"${person.email ?? ''}"`,
          `"${departmentLabel(person.department)}"`,
          `"${roleLabel(person.role)}"`,
          `"${person.is_approved ? 'نشط' : 'بانتظار الموافقة'}"`,
        ].join(',')
      ),
    ].join('\n')
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'users.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const approvedCount = users.filter((person) => person.is_approved).length
  const pendingCount = users.filter((person) => !person.is_approved).length

  const handleNavClick = (label: string) => {
    setActiveTab(label)
    setMenu(false)
    if (label !== 'الاعتمادات' && label !== 'المستخدمون' && label !== 'نظرة عامة') {
      setDepartment('الكل')
    }
  }

  const askCopilot = () => {
    const text = copilotQuery.trim()
    if (!text) return
    if (text.includes('اعتماد') || text.includes('معلق')) {
      setCopilotReply(`توجد حالياً ${pendingCount} حسابات بانتظار الاعتماد. يمكنك مراجعتها من تبويب الاعتمادات.`)
    } else if (text.includes('قسم')) {
      setCopilotReply(`الأقسام المسجّلة: ${dynamicDepartments.filter((item) => item !== 'الكل').join('، ') || 'لا توجد أقسام بعد'}.`)
    } else {
      setCopilotReply('تم استلام سؤالك. المساعد مرتبط بجدول profiles ويمكنه تلخيص المستخدمين والاعتمادات والأقسام.')
    }
    setCopilotQuery('')
  }

  const showOverview = activeTab === 'نظرة عامة' || activeTab === 'التحليلات'
  const showOps = activeTab === 'نظرة عامة' || activeTab === 'المساعد الذكي' || activeTab === 'طلبات الدعم'
  const showUsers = activeTab === 'نظرة عامة' || activeTab === 'المستخدمون' || activeTab === 'الاعتمادات'

  return (
    <main dir="rtl" className={dark ? 'app-shell dark' : 'app-shell'}>
      {menu && (
        <button aria-label="إغلاق القائمة" className="mobile-scrim" onClick={() => setMenu(false)} />
      )}
      <aside className={`sidebar ${menu ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <ShieldCheck />
          </div>
          <div>
            <strong>سِند</strong>
            <small>نظام الدعم الذكي</small>
          </div>
          <button className="icon-btn mobile-close" aria-label="إغلاق القائمة" onClick={() => setMenu(false)}>
            <X />
          </button>
        </div>
        <div className="workspace">
          <span className="workspace-dot" /> أكمي للأنظمة <ChevronDown />
        </div>
        <nav className="nav">
          <p>مساحة العمل</p>
          <Nav icon={<LayoutDashboard />} label="نظرة عامة" active={activeTab === 'نظرة عامة'} onClick={() => handleNavClick('نظرة عامة')} />
          <Nav icon={<Ticket />} label="طلبات الدعم" badge="12" active={activeTab === 'طلبات الدعم'} onClick={() => handleNavClick('طلبات الدعم')} />
          <Nav icon={<Bot />} label="المساعد الذكي" active={activeTab === 'المساعد الذكي'} onClick={() => handleNavClick('المساعد الذكي')} />
          <Nav icon={<Users />} label="المستخدمون" badge={String(users.length)} active={activeTab === 'المستخدمون'} onClick={() => handleNavClick('المستخدمون')} />
          <Nav icon={<FileKey2 />} label="الاعتمادات" badge={String(pendingCount)} active={activeTab === 'الاعتمادات'} onClick={() => handleNavClick('الاعتمادات')} />
          <p className="nav-label">الإدارة</p>
          <Nav icon={<Gauge />} label="التحليلات" active={activeTab === 'التحليلات'} onClick={() => handleNavClick('التحليلات')} />
          <Nav icon={<Settings2 />} label="الإعدادات" active={activeTab === 'الإعدادات'} onClick={() => handleNavClick('الإعدادات')} />
        </nav>
        <div className="sidebar-bottom">
          <div className="online">
            <span /> جميع الأنظمة تعمل
          </div>
          <div className="admin">
            <div className="avatar violet">عع</div>
            <div>
              <strong>عمار عابد</strong>
              <small>مسؤول النظام</small>
            </div>
            <MoreHorizontal />
          </div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <button className="icon-btn menu-btn" aria-label="فتح القائمة" onClick={() => setMenu(true)}>
            <Menu />
          </button>
          <div className="breadcrumbs">
            <span>مساحة العمل</span> <b>/</b> <strong>{activeTab}</strong>
          </div>
          <div className="top-actions">
            <button className="icon-btn" aria-label="المساعدة">
              <CircleHelp />
            </button>
            <button className="theme-toggle" aria-label="تبديل المظهر" onClick={() => setDark(!dark)}>
              {dark ? <Sun /> : <Moon />}
            </button>
            <div className="top-avatar">ع ع</div>
          </div>
        </header>

        <div className="page-wrap">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span className="pulse" /> مركز العمليات الذكي
              </div>
              <h1>أهلاً بك، عمار — ({activeTab})</h1>
              <p>إليك ملخص وحالة القسم المحدد بالنظام.</p>
            </div>
            <button className="primary-btn" onClick={fetchUsers}>
              <Sparkles /> تحديث البيانات
            </button>
          </div>

          {showOverview && (
            <div className="stats-grid">
              <Stat icon={<Ticket />} label="التذاكر المفتوحة" value="٣٦" delta="٨.٢٪" up />
              <Stat icon={<Bot />} label="حلول بالذكاء الاصطناعي" value="٨٧.٤٪" delta="١٢.٥٪" up />
              <Stat icon={<Users />} label="المستخدمون النشطون" value={String(approvedCount)} delta="٤.١٪" up />
              <Stat icon={<Activity />} label="صحة الخوادم" value="٩٩.٩٪" delta="٠.١٪" />
            </div>
          )}

          {showOps && (
            <div className="dashboard-grid">
              <section className="panel copilot">
                <PanelHeader icon={<Bot />} title="مساعد سند الذكي" action="سجل النشاط" />
                <div className="copilot-status">
                  <div className="ai-orb">
                    <Sparkles />
                  </div>
                  <div>
                    <strong>التحليل التلقائي يعمل</strong>
                    <p>تم ربط قاعدة البيانات بنجاح</p>
                  </div>
                  <span className="live-pill">مباشر</span>
                </div>
                <div className="suggestion">
                  <div className="suggestion-icon">
                    <AlertTriangle />
                  </div>
                  <div>
                    <b>اقتراح إجراء جديد</b>
                    <p>توجد {pendingCount} طلبات معلقة بانتظار الاعتماد من لوحة التحكم.</p>
                    <button className="text-btn" onClick={() => setActiveTab('الاعتمادات')}>
                      مراجعة الطلبات <ArrowDownLeft />
                    </button>
                  </div>
                </div>
                {copilotReply && <div className="copilot-reply">{copilotReply}</div>}
                <div className="copilot-input">
                  <Search />
                  <input
                    value={copilotQuery}
                    onChange={(event) => setCopilotQuery(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && askCopilot()}
                    placeholder="اسأل المساعد عن أي شيء..."
                  />
                  <button className="icon-btn" aria-label="إرسال السؤال" onClick={askCopilot}>
                    <Send />
                  </button>
                  <kbd>⌘ K</kbd>
                </div>
              </section>
              <section className="panel chart-panel">
                <PanelHeader icon={<Sparkles />} title="أداء الذكاء الاصطناعي" action="آخر ٣٠ يوماً" />
                <div className="chart-head">
                  <div>
                    <strong>٨٧.٤٪</strong>
                    <span className="trend-up">
                      <ArrowUpLeft /> ١٢.٥٪
                    </span>
                    <small>نسبة الحل الآلي</small>
                  </div>
                  <div className="legend">
                    <span>
                      <i className="dot purple" /> حل آلي
                    </span>
                    <span>
                      <i className="dot gray" /> تدخل بشري
                    </span>
                  </div>
                </div>
                <LineChart />
              </section>
            </div>
          )}

          {activeTab === 'طلبات الدعم' && (
            <section className="panel">
              <PanelHeader icon={<Ticket />} title="طابور التذاكر" action="حسب الأولوية" />
              <div className="ticket-list">
                {[
                  { id: 'HD-1042', title: 'تعذّر الدخول إلى البريد', dept: 'تقنية المعلومات', level: 'عالية' },
                  { id: 'HD-1041', title: 'بطء في الشبكة الداخلية', dept: 'الشبكات', level: 'متوسطة' },
                  { id: 'HD-1038', title: 'طلب صلاحية طابعة', dept: 'الموارد البشرية', level: 'منخفضة' },
                ].map((ticket) => (
                  <div key={ticket.id} className="ticket-row">
                    <div>
                      <b>{ticket.title}</b>
                      <small>
                        {ticket.id} · {ticket.dept}
                      </small>
                    </div>
                    <span className={`status ${ticket.level === 'عالية' ? 'pending' : 'active'}`}>
                      <i />
                      {ticket.level}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {showOverview && (
            <div className="health-grid">
              <HealthItem name="بوابة الموظفين" value="مستقر" />
              <HealthItem name="قاعدة البيانات" value="مستقر" />
              <HealthItem name="المساعد الذكي" value="مستقر" />
              <HealthItem name="خدمة البريد" value="مراقبة" warn />
            </div>
          )}

          {showUsers && (
            <section className="panel users-panel">
              <div className="users-header">
                <div>
                  <PanelHeader
                    icon={<Users />}
                    title={activeTab === 'الاعتمادات' ? 'طلبات الاعتماد المعلقة' : 'إدارة المستخدمين'}
                    action=""
                  />
                  <p>
                    {activeTab === 'الاعتمادات'
                      ? 'عرض وتفعيل الحسابات المنتظرة فقط'
                      : 'تحكم في بيانات الاعتماد والصلاحيات والموافقات.'}
                  </p>
                </div>
                <div className="table-actions">
                  <div className="search-box">
                    <Search />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="البحث باسم المستخدم أو البريد..."
                    />
                  </div>
                  <button className="secondary-btn" onClick={exportCsv}>
                    <Download /> تصدير CSV
                  </button>
                </div>
              </div>
              <div className="tabs">
                {dynamicDepartments.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setDepartment(item)}
                    className={department === item ? 'tab-active' : ''}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="table-scroll">
                {loading ? (
                  <div className="empty-state">جاري جلب المستخدمين...</div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>المستخدم</th>
                        <th>القسم</th>
                        <th>الدور</th>
                        <th>حالة الحساب</th>
                        <th>الموافقة</th>
                        <th>الإجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="empty-state">
                            لا توجد نتائج مطابقة للبحث أو القسم المحدد
                          </td>
                        </tr>
                      ) : (
                        filtered.map((person) => {
                          const isAct = person.is_approved
                          const statusText = isAct ? 'نشط' : 'بانتظار الموافقة'
                          return (
                            <tr key={person.id}>
                              <td>
                                <div className="person">
                                  <div className="avatar violet">{initialsOf(person.full_name)}</div>
                                  <div>
                                    <b>{person.full_name}</b>
                                    <small dir="ltr">{person.email}</small>
                                    {person.username && (
                                      <small dir="ltr" className="username">
                                        @{person.username}
                                      </small>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td>{departmentLabel(person.department)}</td>
                              <td>{roleLabel(person.role)}</td>
                              <td>
                                <span className={`status ${isAct ? 'active' : 'pending'}`}>
                                  <i />
                                  {statusText}
                                </span>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  disabled={savingId === person.id}
                                  aria-label={`تبديل موافقة ${person.full_name}`}
                                  className={`switch ${isAct ? 'on' : ''}`}
                                  onClick={() => toggleApproval(person.id, isAct)}
                                >
                                  <span />
                                </button>
                              </td>
                              <td>
                                <button className="more-btn" aria-label={`خيارات ${person.full_name}`}>
                                  <MoreHorizontal />
                                </button>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          )}

          {activeTab === 'الإعدادات' && (
            <section className="panel">
              <PanelHeader icon={<Settings2 />} title="إعدادات النظام" action="" />
              <p className="settings-copy">يمكنك هنا ضبط خيارات الربط مع Supabase والمساعد الذكي وإشعارات النظام.</p>
              <div className="settings-grid">
                <div className="setting-row">
                  <div>
                    <b>ربط جدول profiles</b>
                    <small>تفعيل الحسابات يتم عبر الحقل is_approved</small>
                  </div>
                  <span className="status active">
                    <i /> متصل
                  </span>
                </div>
                <div className="setting-row">
                  <div>
                    <b>اتجاه الواجهة</b>
                    <small>العربية من اليمين إلى اليسار (RTL)</small>
                  </div>
                  <span className="status active">
                    <i /> مفعّل
                  </span>
                </div>
              </div>
            </section>
          )}
        </div>
      </section>
    </main>
  )
}

function Nav({
  icon,
  label,
  active,
  badge,
  onClick,
}: {
  icon: ReactNode
  label: string
  active?: boolean
  badge?: string
  onClick?: () => void
}) {
  return (
    <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      {icon}
      <span>{label}</span>
      {badge ? <em>{badge}</em> : null}
    </button>
  )
}

function PanelHeader({ icon, title, action }: { icon: ReactNode; title: string; action: string }) {
  return (
    <div className="panel-header">
      <div className="panel-title">
        <span>{icon}</span>
        <h2>{title}</h2>
      </div>
      {action ? (
        <button className="panel-action">
          {action}
          <ChevronDown />
        </button>
      ) : null}
    </div>
  )
}

function Stat({
  icon,
  label,
  value,
  delta,
  up,
}: {
  icon: ReactNode
  label: string
  value: string
  delta: string
  up?: boolean
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <span className={`stat-delta ${up ? 'up' : ''}`}>
        {up ? <ArrowUpLeft /> : <ArrowDownLeft />}
        {delta}
      </span>
      <small>{label}</small>
      <strong>{value}</strong>
      <span className="stat-caption">مقارنة بالأسبوع الماضي</span>
    </div>
  )
}

function HealthItem({ name, value, warn }: { name: string; value: string; warn?: boolean }) {
  return (
    <div className="health-item">
      <div className="health-top">
        <span>
          <i className={`health-dot ${warn ? 'warn' : ''}`} />
          {name}
        </span>
        <b>{value}</b>
      </div>
      <div className={`health-bar ${warn ? 'warn' : ''}`} />
    </div>
  )
}

function LineChart() {
  return (
    <div className="line-chart">
      <svg viewBox="0 0 600 170" preserveAspectRatio="none" aria-label="رسم بياني لمعدل الحل">
        <defs>
          <linearGradient id="fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#8b5cf6" stopOpacity=".22" />
            <stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0 136 C55 122 75 128 116 103 S170 118 216 91 S266 99 310 70 S364 94 405 57 S458 74 502 36 S552 50 600 18 L600 170 L0 170Z"
          fill="url(#fill)"
        />
        <path
          d="M0 136 C55 122 75 128 116 103 S170 118 216 91 S266 99 310 70 S364 94 405 57 S458 74 502 36 S552 50 600 18"
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="chart-days">
        <span>١ يونيو</span>
        <span>٨ يونيو</span>
        <span>١٥ يونيو</span>
        <span>٢٢ يونيو</span>
        <span>اليوم</span>
      </div>
    </div>
  )
}
