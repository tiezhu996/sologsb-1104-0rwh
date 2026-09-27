import { useEffect, useState } from 'react'
import type { Member } from '../../types/member'

interface MeasurementFormProps {
  member: Member
  onRegister: (
    memberId: string,
    values: { lengthMm: number; widthMm: number; thicknessMm: number },
  ) => void
}

type DraftValues = { lengthMm: string; widthMm: string; thicknessMm: string }

function toDraft(member: Member): DraftValues {
  const measurement = member.measurement
  return {
    lengthMm: measurement ? String(measurement.lengthMm) : '',
    widthMm: measurement ? String(measurement.widthMm) : '',
    thicknessMm: measurement ? String(measurement.thicknessMm) : '',
  }
}

/** 一组实测必须三项全部填写，按登记时的理论尺寸整体保存 */
export function MeasurementForm({ member, onRegister }: MeasurementFormProps) {
  const [draft, setDraft] = useState<DraftValues>(() => toDraft(member))

  useEffect(() => {
    setDraft(toDraft(member))
  }, [member])

  const setField = (field: keyof DraftValues, raw: string) => {
    setDraft((current) => ({ ...current, [field]: raw }))
  }

  const submit = () => {
    const lengthMm = Number.parseFloat(draft.lengthMm)
    const widthMm = Number.parseFloat(draft.widthMm)
    const thicknessMm = Number.parseFloat(draft.thicknessMm)
    if (![lengthMm, widthMm, thicknessMm].every((value) => Number.isFinite(value) && value >= 0)) return
    onRegister(member.id, { lengthMm, widthMm, thicknessMm })
  }

  const fields: Array<{ key: keyof DraftValues; label: string; nominal: number }> = [
    { key: 'lengthMm', label: '长', nominal: member.lengthMm },
    { key: 'widthMm', label: '宽', nominal: member.widthMm },
    { key: 'thicknessMm', label: '厚', nominal: member.thicknessMm },
  ]

  return (
    <div className="space-y-2" data-testid={`measure-form-${member.id}`}>
      <div className="grid grid-cols-3 gap-2">
        {fields.map((field) => (
          <label key={field.key} className="block">
            <span className="mb-1 block text-[11px] text-stone-500">实测{field.label} · 理论 {field.nominal}</span>
            <input
              type="number"
              min="0"
              step="0.1"
              inputMode="decimal"
              aria-label={`${member.name}实测${field.label}`}
              data-testid={`measure-input-${member.id}-${field.key}`}
              className="w-full rounded-md border border-wood-100 bg-white px-2 py-1.5 text-xs text-stone-800 outline-none focus:border-wood-500 focus:ring-1 focus:ring-wood-100"
              value={draft[field.key]}
              onChange={(event) => setField(field.key, event.target.value)}
            />
          </label>
        ))}
      </div>
      <button
        type="button"
        className="w-full rounded-md border border-wood-200 bg-wood-50 px-2 py-1.5 text-xs font-medium text-wood-800 transition hover:border-wood-500 hover:bg-wood-100"
        data-testid={`measure-register-${member.id}`}
        onClick={submit}
      >
        {member.measurement ? '重新登记实测' : '登记实测'}
      </button>
    </div>
  )
}
