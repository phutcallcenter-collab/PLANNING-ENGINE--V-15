/**
 * 🎨 COVERAGE BADGE COMPONENT
 * 
 * Simple badge component for displaying coverage status.
 * No logic, just presentation.
 */

import React from 'react'
import { CoverageBadgeProps } from '@/application/ui-models/coverageViewModels'

export function CoverageBadge({ type, onClick, size = 'md' }: CoverageBadgeProps) {
    const badgeConfig = {
        CUBIERTO: {
            label: 'Cubierto',
            className: 'badge-coverage-covered',
            icon: '🔄'
        },
        CUBRIENDO: {
            label: 'Cubriendo',
            className: 'badge-coverage-covering',
            icon: '🤝'
        },
        AUSENCIA: {
            label: 'Ausente',
            className: 'badge-absence',
            icon: '⚠️'
        },
        VACACIONES: {
            label: 'Vacaciones',
            className: 'badge-vacation',
            icon: '🏖️'
        },
        LICENCIA: {
            label: 'Licencia',
            className: 'badge-license',
            icon: '📋'
        }
    }

    const config = badgeConfig[type]

    return (
        <span
            className={`coverage-badge ${config.className} badge-${size} ${onClick ? 'clickable' : ''}`}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
        >
            <span className="badge-icon">{config.icon}</span>
            <span className="badge-label">{config.label}</span>
        </span>
    )
}

/**
 * 🎨 BADGE STYLES (CSS Module or Tailwind)
 * 
 * .coverage-badge {
 *   display: inline-flex;
 *   align-items: center;
 *   gap: 4px;
 *   padding: 4px 8px;
 *   border-radius: 4px;
 *   font-size: 12px;
 *   font-weight: 500;
 * }
 * 
 * .badge-coverage-covered {
 *   background: #e3f2fd;
 *   color: #1976d2;
 *   border: 1px solid #90caf9;
 * }
 * 
 * .badge-coverage-covering {
 *   background: #f3e5f5;
 *   color: #7b1fa2;
 *   border: 1px solid #ce93d8;
 * }
 * 
 * .badge-absence {
 *   background: #fff3e0;
 *   color: #e65100;
 *   border: 1px solid #ffb74d;
 * }
 * 
 * .badge-vacation {
 *   background: #e8f5e9;
 *   color: #2e7d32;
 *   border: 1px solid #81c784;
 * }
 * 
 * .badge-license {
 *   background: #fce4ec;
 *   color: #c2185b;
 *   border: 1px solid #f48fb1;
 * }
 * 
 * .clickable {
 *   cursor: pointer;
 *   transition: transform 0.1s;
 * }
 * 
 * .clickable:hover {
 *   transform: scale(1.05);
 * }
 */
