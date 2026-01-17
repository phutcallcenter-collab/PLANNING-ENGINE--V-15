'use client'

import { DailyCoverageDeficit } from "@/domain/planning/coverageDeficit"
import { ShiftType } from "@/domain/calendar/types"
import React from "react";
import { Tooltip } from "../components/Tooltip";

type Props = {
  shift: ShiftType;
  deficit: DailyCoverageDeficit['shifts'][ShiftType];
};

export function CoverageRisk({ shift, deficit }: Props) {
  const hasDeficit = deficit.deficit > 0;

  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '24px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 700,
    border: '1px solid',
    color: 'white',
    transition: 'all 0.2s ease',
  };

  const tooltipContent = (
    <div>
      <div>Turno {shift === 'DAY' ? 'Día' : 'Noche'}</div>
      <div style={{ marginTop: 4 }}>
        Requeridos: {deficit.required} | Presentes: {deficit.actual}
      </div>
      <div style={{ fontWeight: 600, color: hasDeficit ? '#f87171' : '#4ade80' }}>
        {hasDeficit ? `Déficit: ${deficit.deficit}` : 'Cobertura OK'}
      </div>
    </div>
  );

  if (hasDeficit) {
    style.backgroundColor = '#ef4444'; // red-500
    style.borderColor = '#b91c1c'; // red-700
  } else {
    style.backgroundColor = '#22c55e'; // green-500
    style.borderColor = '#15803d'; // green-700
  }

  return (
    <Tooltip content={tooltipContent}>
      <div style={style}>
        {hasDeficit ? `-${deficit.deficit}` : 'OK'}
      </div>
    </Tooltip>
  );
}
