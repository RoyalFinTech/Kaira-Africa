import { motion } from 'framer-motion';
import {
  FileText, TrendingUp, Users, Activity, Download, RefreshCw,
  CheckCircle2, Clock, AlertCircle, BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageTransition } from '@/components/common/PageTransition';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListReports,
  useGenerateReport,
  getListReportsQueryKey,
} from '@workspace/api-client-react';
import { formatDate } from '@/lib/utils';

const reportDefs = [
  {
    type: 'revenue' as const,
    name: 'Revenue Report',
    description: 'Comprehensive revenue analysis including sources, trends and period comparisons.',
    icon: TrendingUp,
    color: 'text-green-600',
    bg: 'bg-green-50 dark:bg-green-950/20',
  },
  {
    type: 'transaction' as const,
    name: 'Transaction Report',
    description: 'Full transaction log with status breakdown, reconciliation and reference data.',
    icon: BarChart3,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950/20',
  },
  {
    type: 'customer' as const,
    name: 'Customer Report',
    description: 'Customer acquisition, retention, lifetime value and behavioural analytics.',
    icon: Users,
    color: 'text-purple-600',
    bg: 'bg-purple-50 dark:bg-purple-950/20',
  },
  {
    type: 'activity' as const,
    name: 'Activity Report',
    description: 'Complete audit trail of all user actions, system events and access logs.',
    icon: Activity,
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
  },
  {
    type: 'team' as const,
    name: 'Team Performance Report',
    description: 'Team activity, productivity metrics, login history and permission usage.',
    icon: FileText,
    color: 'text-slate-600',
    bg: 'bg-slate-50 dark:bg-slate-950/20',
  },
];

export default function ReportsPage() {
  const { data: reports = [], isLoading } = useListReports();
  const queryClient = useQueryClient();

  const generateReport = useGenerateReport({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() });
      },
    },
  });

  const getReport = (type: string) =>
    // Most recently generated report of this type — reports.length
    // grows with every generation, so the latest is whichever comes
    // first from the backend's desc-by-createdAt ordering.
    reports.find((r) => r.type === type);

  const handleGenerate = (type: typeof reportDefs[number]['type']) => {
    generateReport.mutate({ data: { type, period: 'month' } });
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground mb-1">
              📊 Reports
            </h1>
            <p className="text-muted-foreground text-sm">
              Generate and download business reports for any period.
            </p>
          </div>
        </div>

        {/* Report cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reportDefs.map((def, i) => {
            const report = getReport(def.type);
            const isGenerating = generateReport.isPending && generateReport.variables?.data.type === def.type;
            const isDone = report?.status === 'available';

            return (
              <motion.div
                key={def.type}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${def.bg} flex-shrink-0`}>
                        <def.icon className={`h-5 w-5 ${def.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground text-sm">{def.name}</h3>
                          {isDone && !isGenerating && (
                            <Badge variant="outline" className="text-xs text-green-700 border-green-200 bg-green-50">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Ready
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                          {def.description}
                        </p>

                        {report?.description && (
                          <p className="text-xs text-foreground/80 bg-muted/50 rounded-lg px-3 py-2 mb-3">
                            {report.description}
                          </p>
                        )}

                        {/* Last generated */}
                        <p className="text-xs text-muted-foreground/60 mb-4">
                          {report?.generatedAt
                            ? `Last generated: ${formatDate(new Date(report.generatedAt), 'MMM dd, yyyy HH:mm')}`
                            : 'Not yet generated'}
                        </p>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant={isDone ? 'outline' : 'default'}
                            onClick={() => handleGenerate(def.type)}
                            disabled={isGenerating}
                            className="gap-2 text-xs"
                          >
                            {isGenerating ? (
                              <>
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                Generating…
                              </>
                            ) : (
                              <>
                                <RefreshCw className="h-3.5 w-3.5" />
                                {isDone ? 'Regenerate' : 'Generate'}
                              </>
                            )}
                          </Button>

                          {/* downloadUrl is intentionally null until a
                              real file-export pipeline exists on the
                              backend — never implying a working
                              download for a link that doesn't exist. */}
                          <Button
                            size="sm"
                            variant="outline"
                            disabled
                            title="Export isn't available yet — this report can be viewed here, but PDF/CSV download isn't built yet."
                            className="gap-2 text-xs"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Export not available yet
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Info notice */}
        <div className="p-4 rounded-xl border border-muted bg-muted/30 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Reports are generated from your real business data. PDF/CSV export and scheduled delivery aren't built yet — each report's summary is viewable here in the meantime.
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
