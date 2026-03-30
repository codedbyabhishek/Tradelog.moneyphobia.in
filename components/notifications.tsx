'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trade } from '@/lib/types';
import { checkTradeAlerts, sendNotification } from '@/lib/notifications-manager';
import { Bell, AlertTriangle, CheckCircle, Info, Trash2 } from 'lucide-react';

interface NotificationsProps {
  trades: Trade[];
}

export function Notifications({ trades }: NotificationsProps) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    const newAlerts = checkTradeAlerts(trades);
    setAlerts(newAlerts);

    // Send browser notification for critical alerts
    newAlerts.forEach((alert) => {
      if (alert.type === 'warning' || alert.type === 'achievement') {
        sendNotification(alert.message, alert.id);
      }
    });
  }, [trades]);

  function dismissAlert(alertId: string) {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  }

  function getAlertIcon(type: string) {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'achievement':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'alert':
        return <Bell className="h-4 w-4 text-blue-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-600" />;
    }
  }

  function getAlertColor(type: string) {
    switch (type) {
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'achievement':
        return 'bg-green-50 border-green-200';
      case 'alert':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  }

  return (
    <>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 relative">
            <Bell className="h-4 w-4" />
            Alerts
            {alerts.length > 0 && (
              <Badge variant="destructive" className="absolute -top-2 -right-2">
                {alerts.length}
              </Badge>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Trading Alerts & Notifications</DialogTitle>
            <DialogDescription>
              Real-time alerts based on your trading activity
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {alerts.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No alerts at the moment. Keep trading!
              </p>
            ) : (
              alerts.map((alert) => (
                <Alert
                  key={alert.id}
                  className={`${getAlertColor(alert.type)} border-l-4 flex items-start justify-between`}
                >
                  <div className="flex gap-3 flex-1">
                    <div className="mt-1">{getAlertIcon(alert.type)}</div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{alert.title}</h4>
                      <AlertDescription className="text-xs mt-1">
                        {alert.message}
                      </AlertDescription>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => dismissAlert(alert.id)}
                    className="ml-2 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </Alert>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Show inline alerts for critical issues */}
      {alerts.some((a) => a.type === 'warning') && (
        <Alert className="bg-yellow-50 border-yellow-200 border-l-4 border-l-yellow-600">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            {alerts.filter((a) => a.type === 'warning').length} critical alert
            {alerts.filter((a) => a.type === 'warning').length > 1 ? 's' : ''} for your attention
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
