import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * AlertPanel - Displays outbreak alerts with severity levels
 *
 * @param {Object} props
 * @param {Array} props.alerts - Array of alert objects from outbreak detection API
 * @param {Function} props.onAlertClick - Callback when alert is clicked
 */
const AlertPanel = ({ alerts = [], onAlertClick }) => {
  const [expandedAlert, setExpandedAlert] = React.useState(null);
  const [filter, setFilter] = React.useState('all'); // 'all', 'CRITICAL', 'WARNING'

  const getAlertIcon = (level) => {
    switch (level) {
      case 'CRITICAL':
        return <AlertTriangle className="h-5 w-5" />;
      case 'WARNING':
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getAlertColor = (level) => {
    switch (level) {
      case 'CRITICAL':
        return {
          bg: 'bg-red-50',
          border: 'border-red-300',
          text: 'text-red-900',
          icon: 'text-red-500',
        };
      case 'WARNING':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-300',
          text: 'text-amber-900',
          icon: 'text-amber-500',
        };
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-300',
          text: 'text-blue-900',
          icon: 'text-blue-500',
        };
    }
  };

  const filteredAlerts = React.useMemo(() => {
    if (filter === 'all') return alerts;
    return alerts.filter((alert) => alert.alertLevel === filter);
  }, [alerts, filter]);

  if (!alerts || alerts.length === 0) {
    return (
      <div className="bg-card rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Active Alerts</h3>
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Info className="h-12 w-12 mb-3 opacity-50" />
          <p>No active alerts</p>
          <p className="text-sm mt-1">All disease levels are within normal ranges</p>
        </div>
      </div>
    );
  }

  const criticalCount = alerts.filter((a) => a.alertLevel === 'CRITICAL').length;
  const warningCount = alerts.filter((a) => a.alertLevel === 'WARNING').length;

  return (
    <div className="bg-card rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Active Alerts ({filteredAlerts.length})</h3>

        {/* Filter buttons */}
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All ({alerts.length})
          </Button>
          {criticalCount > 0 && (
            <Button
              variant={filter === 'CRITICAL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('CRITICAL')}
              className="bg-red-100 hover:bg-red-200 text-red-900"
            >
              Critical ({criticalCount})
            </Button>
          )}
          {warningCount > 0 && (
            <Button
              variant={filter === 'WARNING' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('WARNING')}
              className="bg-amber-100 hover:bg-amber-200 text-amber-900"
            >
              Warning ({warningCount})
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        <AnimatePresence>
          {filteredAlerts.map((alert, index) => {
            const colors = getAlertColor(alert.alertLevel);
            const isExpanded = expandedAlert === alert.locationUid + alert.disease;

            return (
              <motion.div
                key={`${alert.locationUid}-${alert.disease}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.05 }}
                className={`${colors.bg} ${colors.border} border-2 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow`}
                onClick={() => {
                  setExpandedAlert(isExpanded ? null : alert.locationUid + alert.disease);
                  if (onAlertClick) onAlertClick(alert);
                }}
              >
                <div className="flex items-start gap-3">
                  <div className={colors.icon}>{getAlertIcon(alert.alertLevel)}</div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className={`font-semibold ${colors.text}`}>
                          {alert.alertLevel}: {alert.disease} outbreak in {alert.location}
                        </h4>
                        <p className="text-sm mt-1">
                          <span className="font-medium">{alert.cases7d} cases</span> in last 7
                          days
                          {alert.percentChange && (
                            <span className="ml-2 text-muted-foreground">
                              ({alert.percentChange > 0 ? '+' : ''}
                              {alert.percentChange.toFixed(1)}% vs baseline)
                            </span>
                          )}
                        </p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-4 pt-4 border-t space-y-2 text-sm"
                      >
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="font-medium">Baseline:</span>{' '}
                            {alert.baseline.toFixed(1)} cases
                          </div>
                          <div>
                            <span className="font-medium">Threshold:</span>{' '}
                            {alert.threshold.toFixed(1)} cases
                          </div>
                        </div>
                        <div className="bg-white/50 p-3 rounded mt-3">
                          <p className="font-medium mb-1">Recommended Action:</p>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {alert.alertLevel === 'CRITICAL' && (
                              <>
                                <li>Deploy rapid response team immediately</li>
                                <li>Increase surveillance in affected areas</li>
                                <li>Mobilize emergency medical supplies</li>
                              </>
                            )}
                            {alert.alertLevel === 'WARNING' && (
                              <>
                                <li>Enhanced monitoring of case reports</li>
                                <li>Review preventive measures</li>
                                <li>Prepare response resources</li>
                              </>
                            )}
                          </ul>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredAlerts.length === 0 && filter !== 'all' && (
        <p className="text-center text-muted-foreground py-4">
          No {filter.toLowerCase()} alerts
        </p>
      )}
    </div>
  );
};

export default AlertPanel;
