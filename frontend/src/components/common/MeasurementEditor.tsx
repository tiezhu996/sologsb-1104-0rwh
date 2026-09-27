import { useEffect, useState } from 'react'
import type { Member } from '../../types/member'
import { useJointStore, type MeasurementDraft } from '../../stores/jointStore'
import { inspectMember } from '../../utils/inspection'
import { cunToMm, formatDimension, mmToCun, roundMeasure } from '../../utils/measure'

interface MeasurementEditorProps {
  member: Member
}

type FieldKey = keyof MeasurementDraft

const FIELD_LABEL: Record<FieldKey, string> = {
  lengthMm: '实测长',
  widthMm: '实测宽',
  thicknessMm: '实测厚',
}

const FIELD_ORDER: FieldKey[] = ['lengthMm', 'widthMm', 'thicknessMm']

function formatSignedMm(valueMm: number): string {
  const sign = valueMm > 0 ? '+' : valueMm < 0 ? '−' : '±'
  return `${sign}${formatDimension(Math.abs(valueMm))}`
}

function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function MeasurementEditor({ member }: MeasurementEditorProps) {
  const saveMemberMeasurement = useJointStore((state) => state.saveMemberMeasurement)
  const clearMemberMeasurement = useJointStore((state) => state.clearMemberMeasurement)
  const inspection = inspectMember(member)
  const [unit, setUnit] = useState<'mm' | '寸'>('mm')
  const [draft, setDraft] = useState<MeasurementDraft>({ lengthMm: 0, widthMm: 0, thicknessMm: 0 })

  const measurement = member.measurement ?? null

  // 构件或已有实测变化（含保存后回写）时，用最新数据同步输入框。
  useEffect(() => {
    if (measurement) {
      setDraft({
        lengthMm: measurement.lengthMm,
        widthMm: measurement.widthMm,
        thicknessMm: measurement.thicknessMm,
      })
    } else {
      // 未登记时以理论尺寸作为预填，方便学员按实际量具读数微调
      setDraft({
        lengthMm: member.lengthMm,
        widthMm: member.widthMm,
        thicknessMm: member.thicknessMm,
      })
    }
    // 仅在切换构件或登记时间变化时重置，输入过程中不覆盖草稿
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member.id, measurement?.measuredAt])

  const updateField = (key: FieldKey, raw: string) => {
    const parsed = Number.parseFloat(raw)
    if (!Number.isFinite(parsed)) return
    setDraft((current) => ({ ...current, [key]: unit === 'mm' ? parsed : cunToMm(parsed) }))
  }

  const canSave = FIELD_ORDER.every((key) => Number.isFinite(draft[key]) && draft[key] > 0)

  return (
    <div className="space-y-3" data-testid={`measure-${member.id}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-stone-600">
          {measurement ? '实测登记' : '尚未登记实测'}
        </span>
        <select
          aria-label="实测单位"
          className="rounded-md border border-wood-100 bg-white px-1.5 py-0.5 text-xs text-wood-700 outline-none focus:border-wood-500"
          value={unit}
          onChange={(event) => setUnit(event.target.value === '寸' ? '寸' : 'mm')}
        >
          <option value="mm">mm</option>
          <option value="寸">寸</option>
        </select>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {FIELD_ORDER.map((key) => {
          const dimension = inspection.dimensions.find((item) => item.key === key)
          const value = roundMeasure(unit === 'mm' ? draft[key] : mmToCun(draft[key]), 2)
          return (
            <div key={key} className="space-y-1">
              <label className="block text-[11px] text-stone-500" htmlFor={`${member.id}-${key}`}>
                {FIELD_LABEL[key]}
              </label>
              <div className="flex items-center rounded-lg border border-wood-100 bg-white focus-within:border-wood-500 focus-within:ring-2 focus-within:ring-wood-100">
                <input
                  id={`${member.id}-${key}`}
                  type="number"
                  min="0"
                  step={unit === 'mm' ? 0.1 : 0.01}
                  aria-label={`${member.name}${FIELD_LABEL[key]}`}
                  className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1.5 text-xs text-stone-800 outline-none"
                  value={value}
                  onChange={(event) => updateField(key, event.target.value)}
                />
                <span className="px-1.5 text-[10px] text-stone-400">{unit}</span>
              </div>
              {dimension && !inspection.stale ? (
                <p
                  className={`text-[10px] leading-4 ${dimension.withinTolerance ? 'text-emerald-700' : 'text-rose-700'}`}
                  data-testid={`dev-${member.id}-${key}`}
                >
                  {formatSignedMm(dimension.deviationMm)}
                  {dimension.withinTolerance ? '' : ' 超差'}
                </p>
              ) : (
                <p className="text-[10px] leading-4 text-stone-400">理论 {formatDimension(member[key])}</p>
              )}
            </div>
          )
        })}
      </div>

      {inspection.stale ? (
        <p className="rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] leading-5 text-amber-800" data-testid={`stale-${member.id}`}>
          登记尺寸或允许偏差已调整，此前实测作废，请复测后重新登记。
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded-lg bg-wood-700 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-wood-900 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canSave}
          data-testid={`save-measure-${member.id}`}
          onClick={() => void saveMemberMeasurement(member.id, draft)}
        >
          {measurement ? '重新登记实测' : '登记实测'}
        </button>
        {measurement ? (
          <button
            type="button"
            className="rounded-lg border border-wood-100 px-3 py-1.5 text-xs text-wood-700 transition hover:border-wood-500 hover:bg-wood-50"
            data-testid={`clear-measure-${member.id}`}
            onClick={() => void clearMemberMeasurement(member.id)}
          >
            清除实测
          </button>
        ) : null}
        {measurement ? (
          <span className="text-[10px] text-stone-400" data-testid={`measured-at-${member.id}`}>
            登记于 {formatDateTime(measurement.measuredAt)}
          </span>
        ) : null}
      </div>
    </div>
  )
}
