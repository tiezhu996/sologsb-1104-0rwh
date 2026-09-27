export type MemberName = '榫头' | '榫眼' | '大边' | '抹头'
export type MemberPart = '出榫件' | '受榫件'
export type GrainDirection = '顺纹' | '横纹'

/** 登记实测时的理论尺寸与公差快照，用于判断登记依据是否调整过 */
export interface MeasurementBaseline {
  lengthMm: number
  widthMm: number
  thicknessMm: number
  toleranceMm: number
}

/** 一件构件的实测尺寸记录 */
export interface MemberMeasurement {
  lengthMm: number
  widthMm: number
  thicknessMm: number
  /** 登记时间（ISO 字符串） */
  measuredAt: string
  /** 登记时所依据的理论尺寸与允许偏差；之后任一被调整，本组实测即作废需复测 */
  baseline: MeasurementBaseline
}

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
  /** 学员登记的实测尺寸；没有实测值的既有构件按未登记处理 */
  measurement?: MemberMeasurement
  schemaRev?: number
}
