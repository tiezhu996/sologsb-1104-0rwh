import { checkTolerance, roundMeasure } from './measure'
import type { Member, MemberMeasurement } from '../types/member'

/** 单件构件的实测状态 */
export type MemberMeasureStatus = 'unregistered' | 'stale' | 'repair' | 'qualified'

export type DimensionKey = 'lengthMm' | 'widthMm' | 'thicknessMm'

export interface DimensionMeasureResult {
  key: DimensionKey
  label: string
  nominalMm: number
  actualMm: number
  deviationMm: number
  withinTolerance: boolean
  exceededByMm: number
}

export interface MemberMeasureSummary {
  status: MemberMeasureStatus
  /** 实测所依据的理论尺寸或允许偏差是否已调整（旧实测作废） */
  baselineChanged: boolean
  /** 发生变化的依据字段，用于提示复测原因 */
  changedFields: DimensionKey[]
  toleranceChanged: boolean
  dimensions: DimensionMeasureResult[]
  measurement: MemberMeasurement | null
}

export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  lengthMm: '长',
  widthMm: '宽',
  thicknessMm: '厚',
}

const BASELINE_KEYS: DimensionKey[] = ['lengthMm', 'widthMm', 'thicknessMm']

/** 取构件当前的理论依据 */
export function currentBaseline(member: Member): Pick<MemberMeasurement, 'baseline'>['baseline'] {
  return {
    lengthMm: member.lengthMm,
    widthMm: member.widthMm,
    thicknessMm: member.thicknessMm,
    toleranceMm: member.toleranceMm,
  }
}

/** 登记尺寸或允许偏差是否在实测登记之后调整过 */
export function isMeasurementStale(member: Member, measurement: MemberMeasurement): {
  stale: boolean
  changedFields: DimensionKey[]
  toleranceChanged: boolean
} {
  const changedFields = BASELINE_KEYS.filter((key) => measurement.baseline[key] !== member[key])
  const toleranceChanged = measurement.baseline.toleranceMm !== member.toleranceMm
  return { stale: changedFields.length > 0 || toleranceChanged, changedFields, toleranceChanged }
}

function buildDimensions(member: Member, measurement: MemberMeasurement, toleranceMm: number): DimensionMeasureResult[] {
  return BASELINE_KEYS.map((key) => {
    const actualMm = measurement[key]
    const nominalMm = measurement.baseline[key]
    const result = checkTolerance(actualMm, nominalMm, toleranceMm)
    return {
      key,
      label: DIMENSION_LABELS[key],
      nominalMm,
      actualMm,
      deviationMm: result.deviationMm,
      withinTolerance: result.withinTolerance,
      exceededByMm: result.exceededByMm,
    }
  })
}

/** 汇总单件构件的实测状态；有实测但依据已调整时，旧数据只作作废提示，不当作合格 */
export function summarizeMemberMeasure(member: Member): MemberMeasureSummary {
  const measurement = member.measurement ?? null

  if (!measurement) {
    return {
      status: 'unregistered',
      baselineChanged: false,
      changedFields: [],
      toleranceChanged: false,
      dimensions: [],
      measurement: null,
    }
  }

  const { stale, changedFields, toleranceChanged } = isMeasurementStale(member, measurement)

  if (stale) {
    return {
      status: 'stale',
      baselineChanged: true,
      changedFields,
      toleranceChanged,
      dimensions: buildDimensions(member, measurement, measurement.baseline.toleranceMm),
      measurement,
    }
  }

  const dimensions = buildDimensions(member, measurement, member.toleranceMm)
  return {
    status: dimensions.some((item) => !item.withinTolerance) ? 'repair' : 'qualified',
    baselineChanged: false,
    changedFields: [],
    toleranceChanged: false,
    dimensions,
    measurement,
  }
}

export interface JointMeasureCounts {
  total: number
  unregistered: number
  stale: number
  repair: number
  qualified: number
  /** 全部构件都测过且在允许偏差范围内，可进入装配 */
  readyToAssemble: boolean
}

/** 统计一组构件中各状态的件数 */
export function summarizeJointMeasures(members: Member[]): JointMeasureCounts {
  const counts: JointMeasureCounts = {
    total: members.length,
    unregistered: 0,
    stale: 0,
    repair: 0,
    qualified: 0,
    readyToAssemble: false,
  }

  for (const member of members) {
    counts[summarizeMemberMeasure(member).status] += 1
  }
  counts.readyToAssemble = members.length > 0 && counts.qualified === members.length
  return counts
}

export const MEASURE_STATUS_META: Record<MemberMeasureStatus, {
  label: string
  badgeClass: string
  chipClass: string
}> = {
  unregistered: {
    label: '未登记',
    badgeClass: 'bg-stone-100 text-stone-600',
    chipClass: 'text-stone-500',
  },
  stale: {
    label: '需要复测',
    badgeClass: 'bg-amber-50 text-amber-800',
    chipClass: 'text-amber-700',
  },
  repair: {
    label: '待修配',
    badgeClass: 'bg-rose-50 text-rose-800',
    chipClass: 'text-rose-700',
  },
  qualified: {
    label: '合格',
    badgeClass: 'bg-emerald-50 text-emerald-800',
    chipClass: 'text-emerald-700',
  },
}

/** 带正负号的偏差文本，例如 +0.3 mm / −0.1 mm */
export function formatSignedDeviation(deviationMm: number): string {
  const value = roundMeasure(deviationMm, 2)
  if (value === 0) return '±0 mm'
  const sign = value > 0 ? '+' : '−'
  return `${sign}${Math.abs(value)} mm`
}
