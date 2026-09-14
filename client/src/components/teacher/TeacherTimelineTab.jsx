import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { teacherTimelineApi } from '@/lib/api';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { formatLocalizedDate } from '@/utils/localizationUtils';
import { Clock, UserPlus, Edit, ArrowUpCircle, Home, FileText, Trash, XCircle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export function TeacherTimelineTab({ teacherId }) {
  const { tr, language } = useLanguage();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  
  const limit = 20;

  useEffect(() => {
    fetchTimeline(1);
  }, [teacherId]);

  const fetchTimeline = async (pageNumber) => {
    try {
      if (pageNumber === 1) setLoading(true);
      else setLoadingMore(true);
      
      const res = await teacherTimelineApi.getTimeline(teacherId, { page: pageNumber, limit });
      if (res && res.data) {
        if (pageNumber === 1) {
          setEvents(res.data);
        } else {
          setEvents(prev => {
            const existingIds = new Set(prev.map(e => e._id));
            const newEvents = res.data.filter(e => !existingIds.has(e._id));
            return [...prev, ...newEvents];
          });
        }
        setHasNextPage(res.hasNextPage);
        setPage(pageNumber);
      }
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        setError(tr("timeline", "unauthorized") || "Unauthorized to view timeline.");
      } else {
        setError(tr("timeline", "error") || "Failed to load timeline.");
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const getEventConfig = (eventType) => {
    switch (eventType) {
      case 'TEACHER_CREATED':
        return { icon: UserPlus, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/20' };
      case 'TEACHER_UPDATED':
        return { icon: Edit, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/20' };
      case 'TIMETABLE_CREATED':
      case 'TIMETABLE_UPDATED':
        return { icon: Clock, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/20' };
      case 'DOCUMENT_UPLOADED':
      case 'DOCUMENT_REPLACED':
        return { icon: FileText, color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/20' };
      case 'DOCUMENT_DEACTIVATED':
        return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/20' };
      case 'DUTY_ASSIGNED':
      case 'DUTY_REMOVED':
        return { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/20' };
      default:
        return { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-900/20' };
    }
  };

  const renderMetadata = (event) => {
    const { eventType, metadata } = event;
    if (!metadata) return null;

    if (eventType === 'STUDENT_UPDATED' && metadata.changedFields) {
      return (
        <div className="mt-2 space-y-1 text-sm bg-muted/30 p-2 rounded-md">
          {Object.entries(metadata.changedFields).map(([key, vals]) => (
            <div key={key} className="flex gap-2 text-muted-foreground">
              <span className="font-medium capitalize">{key}:</span>
              <span>{String(vals.previous || '—')}</span>
              <span>→</span>
              <span className="text-foreground">{String(vals.new || '—')}</span>
            </div>
          ))}
        </div>
      );
    }

    if (eventType === 'STUDENT_PROMOTED') {
      return (
        <div className="mt-2 text-sm text-muted-foreground bg-muted/30 p-2 rounded-md flex gap-2">
           <span>{metadata.previousClassId || '—'}</span>
           <span>→</span>
           <span className="text-foreground font-medium">{metadata.newClassName || metadata.newClassId || '—'}</span>
        </div>
      );
    }

    if (eventType === 'STUDENT_HOSTEL_TRANSFERRED' && metadata.previousValue && metadata.newValue) {
      return (
        <div className="mt-2 space-y-1 text-sm bg-muted/30 p-2 rounded-md text-muted-foreground">
           <div>{tr('timeline', 'previous_value')}: {metadata.previousValue.hostelName} ({metadata.previousValue.room} / {metadata.previousValue.bed})</div>
           <div>{tr('timeline', 'new_value')}: <span className="text-foreground font-medium">{metadata.newValue.hostelName} ({metadata.newValue.room} / {metadata.newValue.bed})</span></div>
        </div>
      );
    }

    if (eventType.startsWith('STUDENT_DOCUMENT_') && metadata.documentType) {
      return (
        <div className="mt-2 text-sm bg-muted/30 p-2 rounded-md text-muted-foreground">
           <span className="font-medium text-foreground">{metadata.documentType}</span>
           {metadata.reason && <div className="text-destructive mt-1">Reason: {metadata.reason}</div>}
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p>{tr("timeline", "loading")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={XCircle}
        title={error.includes("Unauthorized") ? "Access Denied" : "Error"}
        description={error}
      />
    );
  }

  if (events.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title={tr("timeline", "title")}
        description={tr("timeline", "empty")}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative border-s-2 border-muted ms-4 ps-6 space-y-8" dir={language === 'ur' ? 'rtl' : 'ltr'}>
        {events.map((event, index) => {
          const config = getEventConfig(event.eventType);
          const Icon = config.icon;
          
          // Formatted date and time
          const date = new Date(event.createdAt);
          const formattedDate = formatLocalizedDate(date.toISOString(), language);
          const time = date.toLocaleTimeString(language === 'ur' ? 'ur-PK' : 'en-US', { hour: '2-digit', minute: '2-digit' });

          const performedByName = event.performedBy?.name || event.performedBy?.username || 'System';

          return (
            <motion.div 
              key={event._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative"
            >
              <div className={`absolute -start-[42px] mt-1 h-8 w-8 rounded-full border-4 border-background flex items-center justify-center ${config.bg} ${config.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              
              <div className="bg-card border rounded-lg p-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                  <div>
                    <h4 className="font-semibold">{tr("timeline", event.descriptionKey) || event.descriptionKey}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {tr("timeline", "performed_by")} {performedByName}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-col sm:items-end">
                    <span>{formattedDate}</span>
                    <span>{time}</span>
                  </div>
                </div>
                
                {renderMetadata(event)}
              </div>
            </motion.div>
          );
        })}
      </div>

      {hasNextPage && (
        <div className="flex justify-center pt-4">
          <Button 
            variant="outline" 
            onClick={() => fetchTimeline(page + 1)}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading...' : tr("timeline", "loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}
