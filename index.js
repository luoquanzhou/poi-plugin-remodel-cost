'use strict'

/**
 * poi-plugin-remodel-cost
 * 改造资源统计：按舰种筛选母港舰船，选择目标形态，汇总燃料/弹药/特殊资材。
 */

const React = require('react')
const { useSelector } = require('react-redux')
const { stateSelector, shipsSelector, constSelector } = require('views/utils/selectors')

const COSTS = require('./costs')

let Avatar = null
try {
  // eslint-disable-next-line global-require
  Avatar = require('views/components/etc/avatar').Avatar
} catch (e) {
  Avatar = null
}

let config = null
try {
  // eslint-disable-next-line global-require
  config = require('views/env').config
} catch (e) {
  config = null
}

const PREFIX = 'plugin.remodelCost.'

function loadPref(key, def) {
  try {
    if (!config) return def
    const v = config.get(PREFIX + key, def)
    return v == null ? def : v
  } catch (e) {
    return def
  }
}

function savePref(key, value) {
  try {
    if (config) config.set(PREFIX + key, value)
  } catch (e) {
    /* 忽略写入失败 */
  }
}

const h = React.createElement

/* ---------------- 舰种 ---------------- */

const TYPE_CN = {
  1: '海防舰', 2: '驱逐舰', 3: '轻巡洋舰', 4: '重雷装巡洋舰', 5: '重巡洋舰', 6: '航空巡洋舰',
  7: '轻空母', 8: '巡洋战舰', 9: '战舰', 10: '航空战舰', 11: '正规空母', 12: '超弩级战舰',
  13: '潜水舰', 14: '潜水空母', 15: '补给舰', 16: '水上机母舰', 17: '扬陆舰', 18: '装甲空母',
  19: '工作舰', 20: '潜水母舰', 21: '练习巡洋舰', 22: '补给舰',
}

const GROUPS = [
  { id: 'bb', name: '战舰', types: [8, 9, 10, 12] },
  { id: 'cv', name: '空母', types: [7, 11, 18] },
  { id: 'ca', name: '重巡', types: [5, 6] },
  { id: 'cl', name: '轻巡', types: [3, 4] },
  { id: 'dd', name: '驱逐', types: [2] },
  { id: 'ss', name: '潜艇', types: [13, 14] },
  { id: 'de', name: '海防', types: [1] },
  { id: 'aux', name: '辅助舰艇', types: [15, 16, 17, 19, 20, 21, 22] },
]

/* ---------------- 材料 ---------------- */

const MATERIAL_SOURCE = {
  改装设计图: { kind: 'item', id: 58 },
  戦闘詳報: { kind: 'item', id: 78 },
  战斗详报: { kind: 'item', id: 78 },
  試製甲板カタパルト: { kind: 'item', id: 65 },
  试制甲板用弹射器: { kind: 'item', id: 65 },
  新型砲熕兵装資材: { kind: 'item', id: 75 },
  新型火炮兵装资材: { kind: 'item', id: 75 },
  新型航空兵装資材: { kind: 'item', id: 77 },
  新型兵装資材: { kind: 'item', id: 94 },
  海外艦最新技術: { kind: 'item', id: 100 },
  海外舰最新技术: { kind: 'item', id: 100 },
  工廠資源: { kind: 'item', id: 104 },
  工厂资源: { kind: 'item', id: 104 },
  開発資材: { kind: 'res', id: 6 },
  开发资材: { kind: 'res', id: 6 },
  高速建造材: { kind: 'res', id: 4 },
  高速建造资材: { kind: 'res', id: 4 },
}

const MATERIAL_ORDER = [
  '改装设计图', '战斗详报', '试制甲板用弹射器', '新型砲熕兵装資材', '新型航空兵装資材',
  '新型兵装資材', '海外舰最新技术', '工厂资源', '开发资材', '高速建造材', '新型高温高圧缶',
]

const ICONS = require('./icons')

const iconStyle = { width: 16, height: 16, objectFit: 'contain', display: 'block' }
const iconStyleSmall = { width: 14, height: 14, objectFit: 'contain', display: 'block' }

function iconEl(name, small) {
  const src = ICONS[name]
  if (!src) return null
  return h('img', { src, style: small ? iconStyleSmall : iconStyle, alt: '' })
}

function parseCosts(str) {
  const out = {}
  if (!str) return out
  const re = /([^\sx]+)x(\d+)/g
  let m
  while ((m = re.exec(str))) out[m[1]] = (out[m[1]] || 0) + Number(m[2])
  return out
}

/* ---------------- 样式 ---------------- */

const C = {
  border: '1px solid rgba(128,128,128,0.28)',
  muted: 'rgba(128,128,128,0.75)',
  blue: '#2b6cb0',
  green: '#3d8b3d',
  red: '#c0504d',
}

const s = {
  root: { padding: 12, height: '100%', overflowY: 'auto', fontSize: 13, boxSizing: 'border-box' },
  panel: { border: C.border, borderRadius: 4, padding: '9px 12px', marginBottom: 8 },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 },
  chip: {
    padding: '2px 9px', border: '1px solid rgba(128,128,128,0.45)', borderRadius: 3,
    cursor: 'pointer', background: 'transparent', color: 'inherit', fontSize: 12, lineHeight: '18px',
  },
  chipOn: { background: C.blue, borderColor: C.blue, color: '#fff' },
  card: {
    display: 'flex', gap: 8, alignItems: 'flex-start', padding: '7px 9px',
    border: C.border, borderRadius: 4, marginBottom: 6, position: 'relative',
  },
  cardOn: { borderColor: C.blue, background: 'rgba(43,108,176,0.08)' },
  thumbBox: {
    width: 50, height: 30, flex: '0 0 auto', overflow: 'hidden', borderRadius: 2,
    background: 'rgba(128,128,128,0.15)', position: 'relative',
  },
  stickyTop: {
    position: 'sticky', top: 0, zIndex: 20,
    background: 'var(--poi-background-color, #1c1c1c)',
    boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
  },
  fab: {
    position: 'fixed', right: 22, bottom: 26, zIndex: 40, width: 38, height: 38,
    borderRadius: '50%', border: '1px solid rgba(128,128,128,0.4)', cursor: 'pointer',
    background: 'rgba(40,40,40,0.85)', color: '#eee', fontSize: 16,
  },
  main: { flex: 1, minWidth: 0 },
  line1: { display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' },
  name: { fontWeight: 600 },
  sub: { fontSize: 11, color: C.muted },
  line2: { fontSize: 12, color: C.muted, marginTop: 2 },
  line3: { fontSize: 12, marginTop: 2, display: 'flex', flexWrap: 'wrap', gap: 8 },
  matTag: {
    background: 'rgba(128,128,128,0.14)', borderRadius: 3, padding: '1px 5px', fontSize: 11,
    display: 'inline-flex', alignItems: 'center', gap: 3, lineHeight: '16px',
  },
  selectBtn: {
    fontSize: 12, padding: '1px 7px', border: '1px solid rgba(128,128,128,0.45)',
    borderRadius: 3, background: 'transparent', color: 'inherit', cursor: 'pointer',
  },
  menu: {
    position: 'absolute', zIndex: 30, top: '100%', left: 0, marginTop: 2, minWidth: 180,
    background: '#2b2b2b', color: '#eee', border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: 4, boxShadow: '0 6px 18px rgba(0,0,0,0.45)', overflow: 'hidden',
  },
  menuItem: { padding: '5px 10px', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' },
  menuItemOn: { background: 'rgba(43,108,176,0.9)', color: '#fff' },
  markBtn: {
    fontSize: 11, padding: '0 7px', lineHeight: '16px', border: '1px solid rgba(128,128,128,0.45)',
    borderRadius: 3, background: 'transparent', color: 'inherit', cursor: 'pointer', opacity: 0.8,
  },
  markBtnOn: { borderColor: '#d69e2e', color: '#f6ad55', opacity: 1, background: 'rgba(214,158,46,0.12)' },
  summaryRow: { display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 6 },
  sumBlock: { minWidth: 104 },
  sumLabel: { fontSize: 11, color: C.muted, display: 'flex', alignItems: 'center', gap: 4, lineHeight: '16px' },
  sumVal: { fontWeight: 600 },
  ok: { color: C.green },
  bad: { color: C.red },
  hint: { fontSize: 11, color: C.muted, marginTop: 6 },
}

const fmt = (n) => Number(n || 0).toLocaleString('zh-CN')

/* ---------------- 数据 ---------------- */

function chainOf(startId, constShips) {
  const chain = []
  const seen = new Set()
  let id = startId
  while (id && !seen.has(id) && chain.length < 8) {
    const m = constShips[id]
    if (!m) break
    seen.add(id)
    chain.push(m)
    if (!m.api_afterlv) break
    id = m.api_aftershipid
  }
  return chain
}

function costTo(chain, idx) {
  let fuel = 0
  let ammo = 0
  const mats = {}
  for (let i = 0; i < idx; i++) {
    const m = chain[i]
    fuel += m.api_afterfuel || 0
    ammo += m.api_afterbull || 0
    const c = parseCosts(COSTS[m.api_sortno])
    for (const k in c) mats[k] = (mats[k] || 0) + c[k]
  }
  return { fuel, ammo, mats }
}

/* ---------------- 子组件 ---------------- */

function TargetPicker({ chain, idx, onChange }) {
  const [open, setOpen] = React.useState(false)
  React.useEffect(() => {
    if (!open) return undefined
    const close = () => setOpen(false)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [open])

  const cur = chain[idx]
  return h(
    'span',
    { style: { position: 'relative', display: 'inline-block' } },
    h(
      'button',
      {
        style: s.selectBtn,
        onClick: (e) => {
          e.stopPropagation()
          setOpen(!open)
        },
      },
      cur.api_name,
      ' ▾',
    ),
    open
      ? h(
          'div',
          { style: s.menu, onClick: (e) => e.stopPropagation() },
          chain.map((m, i) =>
            i === 0
              ? null
              : h(
                  'div',
                  {
                    key: i,
                    style: { ...s.menuItem, ...(i === idx ? s.menuItemOn : null) },
                    onClick: () => {
                      onChange(i)
                      setOpen(false)
                    },
                  },
                  m.api_name,
                  i === chain.length - 1 ? '（最终）' : '',
                ),
          ),
        )
      : null,
  )
}

function Check({ checked, disabled, onChange, mt = 7 }) {
  return h(
    'div',
    {
      role: 'checkbox',
      'aria-checked': checked,
      onClick: () => {
        if (!disabled) onChange(!checked)
      },
      style: {
        width: 15, height: 15, marginTop: mt, flex: '0 0 auto',
        borderRadius: 2, cursor: disabled ? 'default' : 'pointer',
        border: `1px solid ${checked ? C.blue : 'rgba(128,128,128,0.6)'}`,
        background: checked ? C.blue : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 11, lineHeight: 1, userSelect: 'none',
        opacity: disabled ? 0.4 : 1,
      },
    },
    checked ? '✓' : '',
  )
}

function Toggle({ checked, label, onChange }) {
  return h(
    'div',
    {
      onClick: () => onChange(!checked),
      style: {
        display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        fontSize: 12, lineHeight: '16px', userSelect: 'none',
      },
    },
    h(Check, { checked, onChange, mt: 0 }),
    h('span', null, label),
  )
}

function ShipCard({ r, checked, onCheck, idx, onTarget, ownedCount, marked, onMark }) {
  const c = r.done ? { fuel: 0, ammo: 0, mats: {} } : costTo(r.chain, idx)
  const needLv = r.done ? 0 : r.chain[idx - 1].api_afterlv

  return h(
    'div',
    { style: { ...s.card, ...(checked ? s.cardOn : null) } },
    h(Check, {
      checked, disabled: r.done,
      onChange: (v) => onCheck(v),
    }),
    h(
      'div',
      { style: s.thumbBox },
      Avatar ? h(Avatar, { mstId: (r.chain[idx] && r.chain[idx].api_id) || r.mstId, height: 30 }) : null,
    ),

    h(
      'div',
      { style: s.main },
      h(
        'div',
        { style: s.line1 },
        h('span', { style: s.name }, r.name),
        r.owned ? null : h('span', { style: s.sub }, '(未持有)'),
        r.done ? h('span', { style: s.sub }, '已达最终形态') : null,
        h('span', { style: { flex: 1 } }),
        h(
          'button',
          {
            style: { ...s.markBtn, ...(marked ? s.markBtnOn : null) },
            title: marked ? '取消标记' : '标记为不需要/已完成，隐藏起来',
            onClick: onMark,
          },
          marked ? '★ 取消标记' : '☆ 标记',
        ),
        !r.done
          ? h(TargetPicker, {
              chain: r.chain, idx, onChange: onTarget,
            })
          : null,
      ),
      h(
        'div',
        { style: s.line2 },
        `${TYPE_CN[r.stype] || ''}　`,
        r.owned ? `Lv ${r.lv}` : '未持有',
        r.done
          ? ''
          : `　需要 Lv ${needLv}` +
            (r.owned ? (r.lv >= needLv ? ' ✅' : `（差 ${needLv - r.lv}）`) : ''),
      ),
      r.done
        ? null
        : h(
            'div',
            { style: s.line3 },
            h('span', null, `燃料 ${fmt(c.fuel)}`),
            h('span', null, `弹药 ${fmt(c.ammo)}`),
            MATERIAL_ORDER.filter((m) => c.mats[m]).map((m) => {
              const have = ownedCount(m)
              const short = have != null && c.mats[m] > have
              return h(
                'span',
                { key: m, style: { ...s.matTag, ...(short ? s.bad : null) } },
                ICONS[m] ? iconEl(m, true) : null,
                `${m}×${c.mats[m]}`,
                have != null ? `（有${fmt(have)}）` : '',
              )
            }),
          ),
    ),
  )
}

/* ---------------- 主组件 ---------------- */

function RemodelCostTab() {
  const state = useSelector(stateSelector)
  const ships = useSelector(shipsSelector)
  const constData = useSelector(constSelector)

  // poi 的全局 *:focus 会给获得焦点的元素画白框，这里在插件范围内按掉
  React.useEffect(() => {
    if (document.getElementById('rc-no-focus-ring')) return
    const st = document.createElement('style')
    st.id = 'rc-no-focus-ring'
    st.textContent = `
      .rc-scope, .rc-scope * { outline: none !important; }
      .rc-scope :focus, .rc-scope :focus-visible, .rc-scope :focus-within,
      .rc-scope *:focus, .rc-scope *:focus-visible, .rc-scope *:focus-within {
        outline: none !important;
        box-shadow: none !important;
      }
      .rc-scope input[type="checkbox"] { outline: none !important; box-shadow: none !important; }
    `
    document.head.appendChild(st)
  }, [])

  const [groups, setGroups] = React.useState(() => loadPref('groups', []))
  const [types, setTypes] = React.useState(() => loadPref('types', []))
  const [showUnowned, setShowUnowned] = React.useState(() => loadPref('showUnowned', false))
  const [showDone, setShowDone] = React.useState(() => loadPref('showDone', false))
  const [onlySelected, setOnlySelected] = React.useState(() => loadPref('onlySelected', false))
  const [checked, setChecked] = React.useState(() => loadPref('checked', {}))
  const [targets, setTargets] = React.useState(() => loadPref('targets', {}))
  const [marked, setMarked] = React.useState(() => loadPref('marked', {}))
  const [showMarkedList, setShowMarkedList] = React.useState(false)

  // 任何选择变动都写回 config，下次打开自动恢复
  React.useEffect(() => {
    savePref('checked', checked)
  }, [checked])
  React.useEffect(() => {
    savePref('targets', targets)
  }, [targets])
  React.useEffect(() => {
    savePref('marked', marked)
  }, [marked])
  React.useEffect(() => {
    savePref('groups', groups)
    savePref('types', types)
    savePref('showUnowned', showUnowned)
    savePref('showDone', showDone)
    savePref('onlySelected', onlySelected)
  }, [groups, types, showUnowned, showDone, onlySelected])

  const $ships = (constData && constData.$ships) || {}
  const resources = (state && state.info && state.info.resources) || []
  const useitems = (state && state.info && state.info.useitems) || {}

  const owned = React.useMemo(() => {
    const set = new Set()
    for (const k in ships) {
      const sh = ships[k]
      if (sh && sh.api_ship_id) set.add(sh.api_ship_id)
    }
    return set
  }, [ships])

  const rows = React.useMemo(() => {
    const activeTypes =
      types.length > 0
        ? new Set(types)
        : groups.length > 0
          ? new Set(GROUPS.filter((g) => groups.includes(g.id)).flatMap((g) => g.types))
          : null

    const list = []
    for (const k in ships) {
      const sh = ships[k]
      if (!sh || !sh.api_ship_id) continue
      const m = $ships[sh.api_ship_id]
      if (!m) continue
      if (activeTypes && !activeTypes.has(m.api_stype)) continue
      if (!m.api_afterlv) {
        if (!showDone) continue
        list.push({
          key: 'd:' + k, owned: true, done: true, name: m.api_name, stype: m.api_stype,
          lv: sh.api_lv || 0, chain: [m], book: m.api_sortno, mstId: m.api_id,
        })
        continue
      }
      list.push({
        key: 'o:' + k, owned: true, done: false, name: m.api_name, stype: m.api_stype,
        lv: sh.api_lv || 0, chain: chainOf(sh.api_ship_id, $ships), book: m.api_sortno,
        mstId: m.api_id,
      })
    }

    if (showUnowned) {
      const seenRoot = new Set()
      for (const id in $ships) {
        const m = $ships[id]
        if (!m || !m.api_afterlv) continue
        if (activeTypes && !activeTypes.has(m.api_stype)) continue
        const chain = chainOf(m.api_id, $ships)
        const rootId = chain[0].api_id
        if (owned.has(rootId) || seenRoot.has(rootId)) continue
        seenRoot.add(rootId)
        list.push({
          key: 'u:' + id, owned: false, done: false, name: m.api_name, stype: m.api_stype,
          lv: 0, chain, book: m.api_sortno, mstId: m.api_id,
        })
      }
    }

    list.sort((a, b) => {
      if (a.owned !== b.owned) return a.owned ? -1 : 1
      if (a.done !== b.done) return a.done ? 1 : -1
      if (b.lv !== a.lv) return b.lv - a.lv // 等级从高到低
      return a.book - b.book
    })
    return list
  }, [ships, $ships, groups, types, showUnowned, showDone, owned])

  const summary = React.useMemo(() => {
    let fuel = 0
    let ammo = 0
    const mats = {}
    let count = 0
    for (const r of rows) {
      if (!checked[r.key] || r.done || marked[r.key]) continue
      const idx = targets[r.key] != null ? targets[r.key] : r.chain.length - 1
      const c = costTo(r.chain, idx)
      fuel += c.fuel
      ammo += c.ammo
      for (const k in c.mats) mats[k] = (mats[k] || 0) + c.mats[k]
      count++
    }
    return { fuel, ammo, mats, count }
  }, [rows, checked, targets, marked])

  const ownedCount = (matName) => {
    const src = MATERIAL_SOURCE[matName]
    if (!src) return null
    if (src.kind === 'res') return resources[src.id] || 0
    const it = useitems[src.id]
    if (it == null) return 0
    return typeof it === 'number' ? it : it.api_count || 0
  }

  const toggle = (arr, setArr, v) =>
    setArr(arr.includes(v) ? arr.filter((x) => x !== v) : arr.concat(v))

  const baseRows = rows.filter((r) => !marked[r.key])
  const visibleRows = onlySelected ? baseRows.filter((r) => checked[r.key]) : baseRows
  const markedRows = rows.filter((r) => marked[r.key])
  const rootRef = React.useRef(null)
  const scrollTop = () => {
    const el = rootRef.current
    if (el) el.scrollTop = 0
    let p = el && el.parentElement
    while (p) {
      if (p.scrollHeight > p.clientHeight + 4) {
        p.scrollTop = 0
        break
      }
      p = p.parentElement
    }
  }

  return h(
    'div',
    { ref: rootRef, className: 'rc-scope', style: s.root },

    h(
      'div',
      { style: s.panel },
      h(
        'div',
        { style: s.chips },
        h(
          'button',
          {
            style: { ...s.chip, ...(groups.length === 0 && types.length === 0 ? s.chipOn : null) },
            onClick: () => {
              setGroups([])
              setTypes([])
            },
          },
          '全部',
        ),
        GROUPS.map((g) =>
          h(
            'button',
            {
              key: g.id,
              style: { ...s.chip, ...(groups.includes(g.id) ? s.chipOn : null) },
              onClick: () => toggle(groups, setGroups, g.id),
            },
            g.name,
          ),
        ),
      ),
      groups.length > 0
        ? h(
            'div',
            { style: s.chips },
            GROUPS.filter((g) => groups.includes(g.id)).flatMap((g) =>
              g.types.map((t) =>
                h(
                  'button',
                  {
                    key: t,
                    style: { ...s.chip, ...(types.includes(t) ? s.chipOn : null) },
                    onClick: () => toggle(types, setTypes, t),
                  },
                  TYPE_CN[t] || t,
                ),
              ),
            ),
          )
        : null,
      h(
        'div',
        { style: { display: 'flex', gap: 16, fontSize: 12, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' } },
        h(Toggle, {
          checked: showUnowned, label: '显示未持有',
          onChange: setShowUnowned,
        }),
        h(Toggle, {
          checked: showDone, label: '显示已改造完毕',
          onChange: setShowDone,
        }),
        h(Toggle, {
          checked: onlySelected, label: '只看已选',
          onChange: setOnlySelected,
        }),
        h(
          'button',
          {
            style: { ...s.chip, fontSize: 11, padding: '0 8px' },
            onClick: () => {
              setChecked({})
              setTargets({})
            },
          },
          '清空选择',
        ),
      ),
    ),

    h(
      'div',
      { style: { ...s.panel, ...s.stickyTop } },
      h(
        'div',
        { style: { fontSize: 12 } },
        h('span', { style: { color: C.muted } }, '已选 '),
        h('b', null, summary.count),
        h('span', { style: { color: C.muted } }, ` / 共 ${rows.length}`),
      ),
      h(
        'div',
        { style: s.summaryRow },
        [
          ['燃料', summary.fuel, resources[0]],
          ['弹药', summary.ammo, resources[1]],
          ...MATERIAL_ORDER.filter((m) => summary.mats[m]).map((m) => [m, summary.mats[m], ownedCount(m)]),
        ].map(([label, need, have]) =>
          h(
            'div',
            { key: label, style: s.sumBlock },
            h('div', { style: s.sumLabel }, iconEl(label), label),
            h(
              'div',
              { style: { ...s.sumVal, ...(have != null && need > have ? s.bad : s.ok) } },
              fmt(need),
              have != null ? h('span', { style: { fontSize: 11, color: C.muted } }, ` / ${fmt(have)}`) : null,
            ),
          ),
        ),
      ),
    ),

    markedRows.length > 0
      ? h(
          'div',
          { style: { marginBottom: 8 } },
          h(
            'button',
            {
              style: { ...s.chip, width: '100%', textAlign: 'left' },
              onClick: () => setShowMarkedList(!showMarkedList),
            },
            `${showMarkedList ? '▾' : '▸'} 已标记 ${markedRows.length} 艘（不计入统计，点此${showMarkedList ? '收起' : '展开'}）`,
          ),
          showMarkedList
            ? h(
                'div',
                { style: { marginTop: 6, opacity: 0.75 } },
                markedRows.map((r) =>
                  h(ShipCard, {
                    key: r.key,
                    r,
                    checked: !!checked[r.key],
                    onCheck: (v) => setChecked((prev) => ({ ...prev, [r.key]: v })),
                    idx: targets[r.key] != null ? targets[r.key] : r.chain.length - 1,
                    onTarget: (v) => setTargets((prev) => ({ ...prev, [r.key]: v })),
                    ownedCount,
                    marked: true,
                    onMark: () => setMarked((prev) => ({ ...prev, [r.key]: false })),
                  }),
                ),
              )
            : null,
        )
      : null,

    visibleRows.length === 0
      ? h('div', { style: s.hint }, onlySelected ? '还没有勾选任何船。' : '该筛选下没有符合条件的船。')
      : visibleRows.map((r) =>
          h(ShipCard, {
            key: r.key,
            r,
            checked: !!checked[r.key],
            onCheck: (v) => setChecked((prev) => ({ ...prev, [r.key]: v })),
            idx: targets[r.key] != null ? targets[r.key] : r.chain.length - 1,
            onTarget: (v) => setTargets((prev) => ({ ...prev, [r.key]: v })),
            ownedCount,
            marked: !!marked[r.key],
            onMark: () => setMarked((prev) => ({ ...prev, [r.key]: !prev[r.key] })),
          }),
        ),

    h('div', { style: s.hint }, '材料来自 kcwiki 快照（186 条）；燃料/弹药/等级取自游戏 API。'),

    h('button', { style: s.fab, title: '回到顶部', onClick: scrollTop }, '↑'),
  )
}

module.exports = {
  reactClass: RemodelCostTab,
  pluginDidLoad() {
    // eslint-disable-next-line no-console
    console.log('[remodel-cost] loaded')
  },
}
