import { create } from 'zustand'
import type { Furniture, FurnitureName } from '../types/furniture'
import type { JointType } from '../types/jointType'
import type { Member, MemberMeasurement } from '../types/member'
import { db, ensureSeedData } from '../utils/db'
import { currentBasis } from '../utils/inspection'

export type JointDraft = Omit<JointType, 'id' | 'schemaRev'>
export type FurnitureDraft = Omit<Furniture, 'id' | 'schemaRev'>
export type MeasurementDraft = Pick<MemberMeasurement, 'lengthMm' | 'widthMm' | 'thicknessMm'>

interface JointState {
  joints: JointType[]
  members: Member[]
  furniture: Furniture[]
  stepCounts: Record<string, number>
  selectedJointId: string | null
  loading: boolean
  loadAll: () => Promise<void>
  addJoint: (draft: JointDraft) => Promise<JointType>
  addFurniture: (draft: FurnitureDraft) => Promise<Furniture>
  setSelectedJoint: (id: string) => void
  updateMemberDimensions: (
    memberId: string,
    dimensions: Pick<Member, 'lengthMm' | 'widthMm' | 'thicknessMm' | 'toleranceMm'>,
  ) => Promise<void>
  renameMember: (memberId: string, name: Member['name']) => Promise<void>
  saveMemberMeasurement: (memberId: string, draft: MeasurementDraft) => Promise<void>
  clearMemberMeasurement: (memberId: string) => Promise<void>
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export const useJointStore = create<JointState>((set, get) => ({
  joints: [],
  members: [],
  furniture: [],
  stepCounts: {},
  selectedJointId: null,
  loading: false,

  loadAll: async () => {
    if (get().loading) return
    set({ loading: true })
    try {
      await ensureSeedData()
      const [joints, members, furniture, steps] = await Promise.all([
        db.joints.toArray(),
        db.members.toArray(),
        db.furniture.toArray(),
        db.steps.toArray(),
      ])
      const stepCounts = steps.reduce<Record<string, number>>((counts, step) => {
        counts[step.jointTypeId] = (counts[step.jointTypeId] ?? 0) + 1
        return counts
      }, {})
      const selectedJointId = get().selectedJointId
      set({
        joints: joints.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')),
        members,
        furniture,
        stepCounts,
        selectedJointId: selectedJointId && joints.some((joint) => joint.id === selectedJointId)
          ? selectedJointId
          : joints[0]?.id ?? null,
      })
    } finally {
      set({ loading: false })
    }
  },

  addJoint: async (draft) => {
    const joint: JointType = { ...draft, id: createId('joint'), schemaRev: 3 }
    await db.joints.add(joint)
    set((state) => ({
      joints: [...state.joints, joint].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')),
      selectedJointId: joint.id,
      stepCounts: { ...state.stepCounts, [joint.id]: 0 },
    }))
    return joint
  },

  addFurniture: async (draft) => {
    const furniture: Furniture = { ...draft, id: createId('furniture'), schemaRev: 3 }
    await db.furniture.add(furniture)
    set((state) => ({ furniture: [...state.furniture, furniture] }))
    return furniture
  },

  setSelectedJoint: (id) => set({ selectedJointId: id }),

  updateMemberDimensions: async (memberId, dimensions) => {
    await db.members.update(memberId, dimensions)
    set((state) => ({
      members: state.members.map((member) => (
        member.id === memberId ? { ...member, ...dimensions } : member
      )),
    }))
  },

  renameMember: async (memberId, name) => {
    await db.members.update(memberId, { name })
    set((state) => ({
      members: state.members.map((member) => (
        member.id === memberId ? { ...member, name } : member
      )),
    }))
  },

  saveMemberMeasurement: async (memberId, draft) => {
    const member = get().members.find((item) => item.id === memberId)
    if (!member) return
    // 以当前理论尺寸与允许偏差作为本组实测的登记基准；之后基准再被调整，这组实测即作废待复测。
    const measurement: MemberMeasurement = {
      lengthMm: draft.lengthMm,
      widthMm: draft.widthMm,
      thicknessMm: draft.thicknessMm,
      basis: currentBasis(member),
      measuredAt: new Date().toISOString(),
    }
    await db.members.update(memberId, { measurement })
    set((state) => ({
      members: state.members.map((item) => (
        item.id === memberId ? { ...item, measurement } : item
      )),
    }))
  },

  clearMemberMeasurement: async (memberId) => {
    await db.members.update(memberId, { measurement: null })
    set((state) => ({
      members: state.members.map((item) => (
        item.id === memberId ? { ...item, measurement: null } : item
      )),
    }))
  },
}))

export type { FurnitureName }
