import React from 'react';

const COLOR_THEMES = {
  blue: { iconColor: '#2563EB', iconBg: '#EFF6FF', badgeBorder: '#DBEAFE' },
  amber: { iconColor: '#D97706', iconBg: '#FEF3C7', badgeBorder: '#FDE68A' },
  rose: { iconColor: '#E11D48', iconBg: '#FFE4E6', badgeBorder: '#FECDD3' },
  emerald: { iconColor: '#059669', iconBg: '#D1FAE5', badgeBorder: '#A7F3D0' },
  primary: { iconColor: '#384959', iconBg: '#F1F5F9', badgeBorder: '#E2E8F0' },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'primary',
  onTap,
}) {
  const isClickable = Boolean(onTap);
  const theme = COLOR_THEMES[color] || (typeof color === 'string' && color.startsWith('#')
    ? { iconColor: color, iconBg: `${color}15`, badgeBorder: `${color}30` }
    : COLOR_THEMES.primary);

  return (
    <div
      onClick={onTap}
      className={`rounded-2xl p-4 sm:p-5 bg-white border border-appBorder shadow-sm flex flex-col justify-between h-full min-h-[118px] transition-all duration-200 ${
        isClickable ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 truncate">
          {title}
        </span>
        {Icon && (
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: theme.iconBg, color: theme.iconColor }}
          >
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div>
        <div className="text-2xl sm:text-3xl font-extrabold text-darkNeutral tracking-tight">
          {value}
        </div>
        {subtitle && (
          <div className="text-[11px] sm:text-xs font-medium text-slate-400 mt-0.5 truncate">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
