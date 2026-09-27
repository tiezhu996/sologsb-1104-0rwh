export type MemberName = '榫头' | '榫眼' | '大边' | '抹头'
export type MemberPart = '出榫件' | '受榫件'
export type GrainDirection = '顺纹' | '横纹'

/** 实测登记时所依据的理论尺寸与允许偏差，任一变化即判定该组实测作废 */
export interface MeasurementBasis {
  lengthMm: number
  widthMm: number
  thicknessMm: number
  toleranceMm: number
}

/** 学员下料后登记的实测尺寸，保留登记时间与当时的理论基准 */
export interface MemberMeasurement {
  lengthMm: number
  widthMm: number
  thicknessMm: number
  basis: MeasurementBasis
  measuredAt: string
}

/** 单件构件的检验状态：未登记 / 合格 / 待修配 / 需复测 */
export type MemberInspectionStatus = 'unregistered' | 'qualified' | 'repair' | 'stale'

export interface Member {
  id: string
  jointTypeId: string
  name: MemberName
  part: MemberPart
  grainDir: GrainDirection
  lengthMm: number
  widthMm: number
  thicknessMm: number
  toleranceMm: number
  note: string
  measurement?: MemberMeasurement | null
  schemaRev?: number
}
