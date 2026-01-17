import { computeExecutiveReport } from '@/domain/executiveReport/computeExecutiveReport'
import { AppState } from '@/store/useAppStore'

export const selectExecutiveReport = (
  state: AppState,
  from: string,
  to: string
) =>
  computeExecutiveReport(
    state.representatives,
    state.incidents,
    from,
    to
  )
