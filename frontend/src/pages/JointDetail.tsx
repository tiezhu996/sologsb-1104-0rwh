import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BlankPanel } from '../components/common/BlankPanel'
import { DifficultyTag } from '../components/common/DifficultyTag'
import { MeasurementForm } from '../components/common/MeasurementForm'
import { SizeField } from '../components/common/SizeField'
import { StepRail } from '../components/common/StepRail'
import { useStepOrder } from '../hooks/useStepOrder'
import { useJointStore } from '../stores/jointStore'
import { formatDimension } from '../utils/measure'
import {
  DIMENSION_LABELS,
  MEASURE_STATUS_META,
  formatSignedDeviation,
  summarizeJointMeasures,
  summarizeMemberMeasure,
  type DimensionKey,
} from '../utils/measurement'
import { exportJointData } from '../utils/export'

export default function JointDetail() {
  const { id: idParam } = useParams()
  const id = idParam ?? ''
  const joints = useJointStore((state) => state.joints)
  const members = useJointStore((state) => state.members)
  const furniture = useJointStore((state) => state.furniture)
  const loading = useJointStore((state) => state.loading)
  const loadAll = useJointStore((state) => state.loadAll)
  const updateMemberDimensions = useJointStore((state) => state.updateMemberDimensions)
  const registerMemberMeasurement = useJointStore((state) => state.registerMemberMeasurement)
  const { steps, totalDurationSec, currentStepIndex, move, setCurrentStep } = useStepOrder(id)

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const joint = joints.find((item) => item.id === id)
  const currentMembers = members
    .filter((member) => member.jointTypeId === id)
    .sort((a, b) => a.lengthMm - b.lengthMm)
  const currentFurniture = furniture.filter((item) => item.jointTypeId === id)
  const measureCounts = summarizeJointMeasures(currentMembers)

  if (!joint && !loading) {
    return (
      <div data-testid="detail-joint">
        <BlankPanel title="未找到这项榫卯" description="记录可能已被移除，请返回图鉴重新选择。" />
      </div>
    )
  }

  if (!joint) {
    return <div className="py-16 text-center text-sm text-stone-500" data-testid="detail-joint">正在读取木作数据…</div>
  }

  return (
    <div className="space-y-7" data-testid="detail-joint">
      <div>
        <Link to="/joints" className="inline-flex items-center gap-1.5 text-sm text-wood-700 hover:underline">
          <span aria-hidden="true">←</span> 返回图鉴总览
        </Link>
      </div>

      <section className="panel overflow-hidden">
        <div className="relative grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-start sm:p-8">
          <div className="absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-wood-50" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-wood-100 bg-white px-3 py-1 text-xs text-wood-700">{joint.family}</span>
              <DifficultyTag difficulty={joint.difficulty} />
              <span className="text-xs text-stone-500">{joint.glueNeeded ? '建议配合胶合' : '可拆式干装'}</span>
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-wood-900 sm:text-4xl">{joint.name} · 结构详情</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-600">{joint.strengthNote}</p>
          </div>
          <div className="relative grid grid-cols-3 gap-3">
            <Stat label="构件" value={currentMembers.length} unit="件" />
            <Stat label="步序" value={steps.length} unit="步" />
            <Stat label="演示" value={totalDurationSec} unit="秒" />
          </div>
        </div>
        <div className="flex flex-wrap gap-3 border-t border-wood-100 bg-wood-50/60 px-6 py-4 sm:px-8">
          <Link className="primary-button" to={`/joints/${joint.id}/steps`}>编排拆装步序</Link>
          <Link className="secondary-button" to={`/joints/${joint.id}/diagram`}>进入示意图绘制台</Link>
          <button type="button" className="secondary-button" onClick={() => void exportJointData(joint.id, joint.name)}>导出当前类型</button>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-wood-900">构件尺寸与实测登记</h2>
            <p className="mt-1 text-sm text-stone-500">图鉴尺寸为理论值；登记实测长、宽、厚后按偏差判定，超差标为待修配。理论尺寸或允许偏差调整后，旧实测作废需复测。</p>
          </div>
          <MeasureSummaryPill counts={measureCounts} />
        </div>

        <AssemblyConclusion counts={measureCounts} />

        {currentMembers.length === 0 ? (
          <BlankPanel title="尚无构件记录" description="当前类型的构件尺寸仍待补充。" />
        ) : (
          <div className="panel overflow-x-auto">
            <table className="min-w-[1180px] w-full border-collapse text-left text-sm">
              <thead className="bg-wood-50 text-xs text-wood-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">构件</th>
                  <th className="px-4 py-3 font-semibold">归属</th>
                  <th className="px-4 py-3 font-semibold">纹理</th>
                  <th className="px-4 py-3 font-semibold">理论长 / 允许偏差</th>
                  <th className="px-4 py-3 font-semibold">理论宽</th>
                  <th className="px-4 py-3 font-semibold">理论厚</th>
                  <th className="px-4 py-3 font-semibold">实测登记（mm）</th>
                  <th className="px-4 py-3 font-semibold">实测结果</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {currentMembers.map((member) => (
                  <MemberMeasureRow
                    key={member.id}
                    member={member}
                    onDimensionsChange={updateMemberDimensions}
                    onRegister={registerMemberMeasurement}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-wood-900">适用家具</h2>
            <p className="mt-1 text-sm text-stone-500">反查该榫卯在实际家具中的位置与承力作用。</p>
          </div>
          {currentFurniture.length === 0 ? (
            <BlankPanel title="尚未关联家具" description="可在家具反查页登记使用部位。" />
          ) : (
            <div className="space-y-3">
              {currentFurniture.map((item) => (
                <article key={item.id} className="panel p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-wood-900">{item.name}</h3>
                    <span className="rounded-full bg-wood-50 px-2.5 py-1 text-xs text-wood-700">{item.era}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-stone-700">{item.position}</p>
                  <p className="mt-2 text-xs leading-5 text-stone-500">{item.loadNote}</p>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-wood-900">拆装步序</h2>
              <p className="mt-1 text-sm text-stone-500">点击步骤查看风险提醒，也可直接拖动调整顺序。</p>
            </div>
            <span className="text-xs text-wood-700">共 {totalDurationSec} 秒</span>
          </div>
          {steps.length === 0 ? (
            <BlankPanel title="尚无拆装步骤" description="进入步序编排页补充拆装动作。" />
          ) : (
            <StepRail steps={steps} currentIndex={currentStepIndex} onSelect={setCurrentStep} onMove={(from, to) => void move(from, to)} />
          )}
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="rounded-xl border border-wood-100 bg-white/90 px-3 py-3 text-center shadow-sm">
      <strong className="block text-xl text-wood-700">{value}</strong>
      <span className="mt-1 block text-[11px] text-stone-500">{label} · {unit}</span>
    </div>
  )
}

interface MemberMeasureRowProps {
  member: ReturnType<typeof useJointStore.getState>['members'][number]
  onDimensionsChange: ReturnType<typeof useJointStore.getState>['updateMemberDimensions']
  onRegister: ReturnType<typeof useJointStore.getState>['registerMemberMeasurement']
}

function MemberMeasureRow({ member, onDimensionsChange, onRegister }: MemberMeasureRowProps) {
  const summary = summarizeMemberMeasure(member)
  const meta = MEASURE_STATUS_META[summary.status]

  return (
    <tr
      className="align-top"
      data-testid={`measure-row-${member.id}`}
      data-status={summary.status}
    >
      <td className="px-4 py-4">
        <strong className="block text-stone-900">{member.name}</strong>
        <span className="mt-1 block max-w-52 text-xs leading-5 text-stone-500">{member.note}</span>
      </td>
      <td className="whitespace-nowrap px-4 py-4 text-stone-600">{member.part}</td>
      <td className="whitespace-nowrap px-4 py-4 text-stone-600">{member.grainDir}</td>
      <td className="w-36 px-3 py-3">
        <SizeField
          label={`${member.name}长度`}
          valueMm={member.lengthMm}
          toleranceMm={member.toleranceMm}
          showHint={false}
          onChange={(value) => void onDimensionsChange(member.id, {
            lengthMm: value,
            widthMm: member.widthMm,
            thicknessMm: member.thicknessMm,
            toleranceMm: member.toleranceMm,
          })}
        />
        <p className="mt-1 text-[11px] text-stone-500">允许偏差 ±{formatDimension(member.toleranceMm, 'mm', 2)}</p>
      </td>
      <td className="w-32 px-3 py-3">
        <SizeField
          label={`${member.name}宽度`}
          valueMm={member.widthMm}
          toleranceMm={member.toleranceMm}
          showHint={false}
          onChange={(value) => void onDimensionsChange(member.id, {
            lengthMm: member.lengthMm,
            widthMm: value,
            thicknessMm: member.thicknessMm,
            toleranceMm: member.toleranceMm,
          })}
        />
      </td>
      <td className="w-32 px-3 py-3">
        <SizeField
          label={`${member.name}厚度`}
          valueMm={member.thicknessMm}
          toleranceMm={member.toleranceMm}
          showHint={false}
          onChange={(value) => void onDimensionsChange(member.id, {
            lengthMm: member.lengthMm,
            widthMm: member.widthMm,
            thicknessMm: value,
            toleranceMm: member.toleranceMm,
          })}
        />
      </td>
      <td className="w-72 px-4 py-3">
        <MeasurementForm member={member} onRegister={(memberId, values) => void onRegister(memberId, values)} />
      </td>
      <td className="w-72 px-4 py-4" data-testid={`measure-result-${member.id}`}>
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${meta.badgeClass}`} data-testid={`measure-status-${member.id}`}>
          {meta.label}
        </span>
        <MeasureResultDetail summary={summary} />
      </td>
    </tr>
  )
}

function MeasureResultDetail({ summary }: { summary: ReturnType<typeof summarizeMemberMeasure> }) {
  if (summary.status === 'unregistered') {
    return <p className="mt-2 text-xs leading-5 text-stone-500">尚未登记实测尺寸，下料后请录入长、宽、厚。</p>
  }

  const measuredAt = summary.measurement
    ? new Date(summary.measurement.measuredAt).toLocaleString('zh-CN', { hour12: false })
    : ''

  if (summary.status === 'stale') {
    const reasons: string[] = [
      ...summary.changedFields.map((key: DimensionKey) => `理论${DIMENSION_LABELS[key]}`),
      ...(summary.toleranceChanged ? ['允许偏差'] : []),
    ]
    return (
      <div className="mt-2 space-y-1">
        <p className="text-xs font-medium text-amber-800">登记依据（{reasons.join('、')}）已调整，该组实测作废</p>
        <p className="text-[11px] leading-5 text-stone-400">请按现行理论尺寸重新测量登记，旧数据不作为合格依据。</p>
        <p className="text-[11px] text-stone-400">原登记时间 {measuredAt}</p>
      </div>
    )
  }

  return (
    <div className="mt-2 space-y-1">
      <ul className="space-y-0.5 text-xs leading-5">
        {summary.dimensions.map((dimension) => (
          <li
            key={dimension.key}
            className={dimension.withinTolerance ? 'text-stone-600' : 'font-medium text-rose-700'}
            data-testid={`measure-deviation-${dimension.key}`}
          >
            {dimension.label} {dimension.actualMm} mm，偏差 {formatSignedDeviation(dimension.deviationMm)}
            {dimension.withinTolerance
              ? '（合格）'
              : `，超差 ${formatDimension(dimension.exceededByMm, 'mm', 2)}，待修配`}
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-stone-400">登记时间 {measuredAt}</p>
    </div>
  )
}

function MeasureSummaryPill({ counts }: { counts: ReturnType<typeof summarizeJointMeasures> }) {
  const items: Array<{ key: keyof typeof MEASURE_STATUS_META; value: number }> = [
    { key: 'qualified', value: counts.qualified },
    { key: 'repair', value: counts.repair },
    { key: 'stale', value: counts.stale },
    { key: 'unregistered', value: counts.unregistered },
  ]
  return (
    <div className="hidden shrink-0 items-center gap-2 sm:flex" data-testid="detail-measure-summary">
      {items.map((item) => (
        <span
          key={item.key}
          className={`rounded-full bg-white px-2.5 py-1 text-[11px] ring-1 ring-inset ring-wood-100 ${MEASURE_STATUS_META[item.key].chipClass}`}
        >
          {MEASURE_STATUS_META[item.key].label} {item.value}
        </span>
      ))}
    </div>
  )
}

function AssemblyConclusion({ counts }: { counts: ReturnType<typeof summarizeJointMeasures> }) {
  if (counts.total === 0) return null

  if (counts.readyToAssemble) {
    return (
      <div
        className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4"
        data-testid="assembly-conclusion"
        data-ready="true"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-base text-white" aria-hidden="true">✓</span>
        <div>
          <p className="text-sm font-semibold text-emerald-900">整套 {counts.total} 件构件均已实测且偏差在允许范围内，可进入装配。</p>
          <p className="mt-0.5 text-xs text-emerald-700">装配前仍建议按步序试合，留意木纹与受力方向。</p>
        </div>
      </div>
    )
  }

  const blockers: string[] = []
  if (counts.repair > 0) blockers.push(`${counts.repair} 件待修配`)
  if (counts.stale > 0) blockers.push(`${counts.stale} 件需要复测`)
  if (counts.unregistered > 0) blockers.push(`${counts.unregistered} 件未登记`)

  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4"
      data-testid="assembly-conclusion"
      data-ready="false"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500 text-base text-white" aria-hidden="true">!</span>
      <div>
        <p className="text-sm font-semibold text-amber-900">暂不可进入装配：{blockers.join('、')}。</p>
        <p className="mt-0.5 text-xs text-amber-700">需整套构件全部测过且均在允许偏差范围内，才给出可装配结论。</p>
      </div>
    </div>
  )
}
