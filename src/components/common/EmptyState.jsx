import React from 'react';
import { FileQuestion, Database, AlertCircle, TrendingUp } from 'lucide-react';

const EmptyState = ({
  type = 'no-data',
  message,
  description,
  className = ''
}) => {
  const states = {
    'no-data': {
      icon: Database,
      title: message || 'No Data Available',
      description: description || 'There is currently no data available for this disease and location.',
      iconColor: 'text-slate-400',
      bgColor: 'bg-slate-50'
    },
    'insufficient-data': {
      icon: FileQuestion,
      title: message || 'Insufficient Data',
      description: description || 'We need at least 10 data points to generate reliable forecasts. Please check back when more data is available.',
      iconColor: 'text-amber-400',
      bgColor: 'bg-amber-50'
    },
    'error': {
      icon: AlertCircle,
      title: message || 'Unable to Load Data',
      description: description || 'An error occurred while loading the data. Please try again later.',
      iconColor: 'text-red-400',
      bgColor: 'bg-red-50'
    },
    'coming-soon': {
      icon: TrendingUp,
      title: message || 'Analysis Coming Soon',
      description: description || 'This analysis will be available once we have collected sufficient historical data.',
      iconColor: 'text-blue-400',
      bgColor: 'bg-blue-50'
    }
  };

  const state = states[type] || states['no-data'];
  const Icon = state.icon;

  return (
    <div className={`flex items-center justify-center min-h-[300px] ${className}`}>
      <div className={`text-center max-w-md px-6 py-8 rounded-lg ${state.bgColor}`}>
        <div className="flex justify-center mb-4">
          <div className={`p-3 rounded-full bg-white shadow-sm`}>
            <Icon className={`h-8 w-8 ${state.iconColor}`} />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-slate-700 mb-2">
          {state.title}
        </h3>
        <p className="text-sm text-slate-500 leading-relaxed">
          {state.description}
        </p>
      </div>
    </div>
  );
};

export default EmptyState;
