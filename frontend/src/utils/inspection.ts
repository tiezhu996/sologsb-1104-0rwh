import { roundMeasure } from './measure'
import type { Member, MemberInspectionStatus, MeasurementBasis } from '../types/member'

export type DimensionKey = 'lengthMm' | 'widthMm' | 'thicknessMm'

export const DIMENSION_LABEL: Record<DimensionKey, string> = {
  lengthMm: '长',
  widthMm: '宽',
  thicknessMm: '厚',
}

export const DIMENSION_KEYS: DimensionKey[] = ['lengthMm', 'widthMm', 'thicknessMm']

/** 当前理论尺寸与允许偏差，即检验实测所对照的现行基准 */
export function currentBasis(member: Member): MeasurementBasis {
  return {
    lengthMm: member.lengthMm,
    widthMm: member.widthMm,
    thicknessMm: member.thicknessMm,
    toleranceMm: member.toleranceMm,
  }
}

/** 理论尺寸或允许偏差在实测登记后被调整，旧的一组实测即作废，需要复测 */
export function isMeasurementStale(member: Member): boolean {
  const measurement = member.measurement
  if (!measurement) return false
  return (DIMENSION_KEYS.some((key) => measurement.basis[key] !== member[key])
    || measurement.basis.toleranceMm !== member.toleranceMm)
}

export interface DimensionInspection {
  key: DimensionKey
  label: string
  nominalMm: number
  actualMm: number
  /** 实测减理论，正负号区分做大/做小 */
  deviationMm: number
  withinTolerance: boolean
}

export interface MemberInspection {
  status: MemberInspectionStatus
  stale: boolean
  dimensions: DimensionInspection[]
  /** 三个方向中最大的绝对偏差 */
  maxDeviationMm: number
  /** 三个方向中最大的超差量 */
  maxExceededMm: number
}

export function inspectMember(member: Member): MemberInspection {
  const measurement = member.measurement
  if (!measurement) {
    return { status: 'unregistered', stale: false, dimensions: [], maxDeviationMm: 0, maxExceededMm: 0 }
  }

  const basis = measurement.basis
  const dimensions = DIMENSION_KEYS.map((key) => {
    const nominalMm = basis[key]
    const actualMm = measurement[key]
    const deviationMm = actualMm - nominalMm
    return {
      key,
      label: DIMENSION_LABEL[key],
      nominalMm,
      actualMm,
      deviationMm: roundMeasure(deviationMm, 2),
      withinTolerance: Math.abs(deviationMm) <= basis.toleranceMm,
    }
  })

  const stale = isMeasurementStale(member)
  const withinTolerance = dimensions.every((dimension) => dimension.withinTolerance)
  const maxDeviationMm = roundMeasure(
    dimensions.reduce((max, dimension) => Math.max(max, Math.abs(dimension.deviationMm)), 0),
    2,
  )
  const maxExceededMm = roundMeasure(
    dimensions.reduce(
      (max, dimension) => Math.max(max, Math.abs(dimension.deviationMm) - basis.toleranceMm),
      0,
    ),
    2,
  )

  return {
    status: stale ? 'stale' : withinTolerance ? 'qualified' : 'repair',
    stale,
    dimensions,
    maxDeviationMm,
    maxExceededMm,
  }
}

export interface MemberInspectionCounts {
  total: number
  unregistered: number
  qualified: number
  repair: number
  stale: number
}

export function summarizeInspection(members: Member[]): MemberInspectionCounts {
  const counts: MemberInspectionCounts = { total: members.length, unregistered: 0, qualified: 0, repair: 0, stale: 0 }
  members.forEach((member) => {
    counts[inspectMember(member).status] += 1
  })
  return counts
}

/** 整套构件都测过、基准未变且全部在允许偏差范围内，方可进入装配 */
export function isReadyForAssembly(members: Member[]): boolean {
  if (members.length === 0) return false
  return members.every((member) => inspectMember(member).status === 'qualified')
}
