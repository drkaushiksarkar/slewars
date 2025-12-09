import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * KPICard - Displays key performance indicators with trend information
 *
 * @param {Object} props
 * @param {string} props.title - Card title
 * @param {number|string} props.value - Main value to display
 * @param {React.Component} props.icon - Icon component (lucide-react)
 * @param {string} props.trend - Trend direction: 'up', 'down', 'neutral'
 * @param {string} props.trendValue - Trend value (e.g., "+2.3%")
 * @param {string} props.subtitle - Optional subtitle text
 * @param {string} props.colorScheme - Color scheme: 'blue', 'rose', 'green', 'purple', 'amber'
 * @param {number} props.delay - Animation delay
 */
const KPICard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  subtitle,
  colorScheme = 'blue',
  delay = 0,
}) => {
  const colorClasses = {
    blue: {
      border: 'border-blue-300',
      iconColor: 'text-blue-500',
      trendUpColor: 'text-green-600',
      trendDownColor: 'text-red-600',
      trendNeutralColor: 'text-gray-600',
    },
    rose: {
      border: 'border-rose-300',
      iconColor: 'text-rose-500',
      trendUpColor: 'text-green-600',
      trendDownColor: 'text-red-600',
      trendNeutralColor: 'text-gray-600',
    },
    green: {
      border: 'border-green-300',
      iconColor: 'text-green-500',
      trendUpColor: 'text-green-600',
      trendDownColor: 'text-red-600',
      trendNeutralColor: 'text-gray-600',
    },
    purple: {
      border: 'border-purple-300',
      iconColor: 'text-purple-500',
      trendUpColor: 'text-green-600',
      trendDownColor: 'text-red-600',
      trendNeutralColor: 'text-gray-600',
    },
    amber: {
      border: 'border-amber-300',
      iconColor: 'text-amber-500',
      trendUpColor: 'text-green-600',
      trendDownColor: 'text-red-600',
      trendNeutralColor: 'text-gray-600',
    },
  };

  const colors = colorClasses[colorScheme] || colorClasses.blue;

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getTrendColor = () => {
    if (trend === 'up') return colors.trendUpColor;
    if (trend === 'down') return colors.trendDownColor;
    return colors.trendNeutralColor;
  };

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay }}
      className={`bg-card p-4 rounded-lg border-2 ${colors.border} flex items-center gap-3 hover:shadow-md transition-shadow`}
    >
      {Icon && <Icon className={`h-10 w-10 ${colors.iconColor} flex-shrink-0`} />}
      <div className="flex-1 min-w-0">
        <h3 className="text-xs font-medium text-muted-foreground truncate">{title}</h3>
        <p className="text-2xl font-bold">{value?.toLocaleString() || '0'}</p>
        {(trendValue || subtitle) && (
          <div className={`flex items-center gap-1 text-xs mt-1 ${getTrendColor()}`}>
            {trendValue && (
              <>
                {getTrendIcon()}
                <span className="font-medium">{trendValue}</span>
              </>
            )}
            {subtitle && !trendValue && (
              <span className="text-muted-foreground">{subtitle}</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default KPICard;
