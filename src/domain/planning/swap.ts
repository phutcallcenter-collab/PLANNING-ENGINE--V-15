import { ISODate, ShiftType } from '../calendar/types'
import { RepresentativeId } from '../representatives/types'

/**
 * Represents the definitive, atomic operation of a shift swap.
 * This is a record of an operational change, not a planning entity.
 */
export type SwapType = 'COVER' | 'DOUBLE' | 'SWAP'

export type SwapEvent =
  | {
    id: string
    type: 'COVER'
    date: ISODate
    shift: ShiftType
    fromRepresentativeId: RepresentativeId // Original owner who is NOT working
    toRepresentativeId: RepresentativeId // Person covering who IS working
    note?: string
    createdAt: string
  }
  | {
    id: string
    type: 'DOUBLE'
    date: ISODate
    shift: ShiftType
    representativeId: RepresentativeId // Person working EXTRA
    note?: string
    createdAt: string
  }
  | {
    id: string
    type: 'SWAP'
    date: ISODate
    fromRepresentativeId: RepresentativeId
    fromShift: ShiftType
    toRepresentativeId: RepresentativeId
    toShift: ShiftType
    note?: string
    createdAt: string
  }
