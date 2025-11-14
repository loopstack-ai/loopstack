import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.tsx';
import { ScrollArea } from '../components/ui/scroll-area.tsx';
import { Badge } from '../components/ui/badge.tsx';
import { Link } from 'react-router-dom';
import LoadingCentered from '../components/LoadingCentered.tsx';
import { Alert } from '../components/ui/alert.tsx';
import { Home } from 'lucide-react';
import MainLayout from '../components/layout/MainLayout.tsx';
import { useDashboardStats } from '../hooks/useDashboard.ts';
import { useStudio } from '../providers/StudioProvider.tsx';

export default function DashboardPage() {
  const { router, environment } = useStudio();

  const { data: dashboardStats, isLoading, error } = useDashboardStats();

  if (isLoading) {
    return <LoadingCentered loading={isLoading} />;
  }

  if (error) {
    return (
      <Alert className="p-4 text-red-500 w-full">Error loading dashboard: {error.message}</Alert>
    );
  }

  if (!dashboardStats) {
    return <div className="p-4">No data available</div>;
  }

  const breadcrumbsData = [
    {
      label: environment.name,
      href: '#',
      icon: <Home className="h-4 w-4" />
    },
    { label: 'Dashboard', current: true }
  ];

  return (
    <MainLayout breadcrumbsData={breadcrumbsData}>
      <h1 className="text-3xl font-bold tracking-tight mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="md:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link
                to={router.getWorkspacesCreate()}
                className="block w-full text-left text-sm text-primary hover:text-primary/80 font-medium transition-colors p-2 hover:bg-muted rounded"
              >
                Create Workspace
              </Link>
              <Link
                to={router.getWorkspaces()}
                className="block text-sm text-primary hover:text-primary/80 font-medium transition-colors p-2 hover:bg-muted rounded"
              >
                View Workspaces
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Total Automation Runs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{dashboardStats.totalAutomationRuns}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Completed Runs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{dashboardStats.completedRuns}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Error Runs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-destructive">{dashboardStats.errorRuns}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-600">{dashboardStats.inProgressRuns}</p>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Runs</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardStats.recentRuns.length === 0 ? (
              <p className="text-muted-foreground">No recent runs.</p>
            ) : (
              <ScrollArea className="h-72 w-full">
                <div className="space-y-2 pr-2">
                  {dashboardStats.recentRuns.map((run: any) => {
                    const statusColors = {
                      completed: 'bg-green-50 text-green-900 border-green-200',
                      failed: 'bg-destructive/10 text-destructive border-destructive/20',
                      canceled: 'bg-orange-50 text-orange-900 border-orange-200',
                      running: 'bg-blue-50 text-blue-900 border-blue-200',
                      paused: 'bg-yellow-50 text-yellow-900 border-yellow-200',
                      pending: 'bg-muted text-muted-foreground border-border'
                    };

                    const statusColor =
                      statusColors[run.status as keyof typeof statusColors] ||
                      'bg-muted text-muted-foreground border-border';

                    return (
                      <Link
                        to={router.getPipeline(run.id)}
                        key={run.id}
                        className="block p-4 bg-card border border-border rounded-lg hover:shadow-md hover:border-primary/50 transition-all duration-200 group w-full overflow-hidden"
                      >
                        <div className="flex items-start justify-between min-w-0">
                          <div className="flex-1 min-w-0 pr-2">
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                              Run #{run.run} {run.title ? `(${run.title})` : ''}
                            </h3>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge
                                className={`text-xs px-2 py-1 rounded-full border whitespace-nowrap ${statusColor}`}
                              >
                                {run.status}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(run.updatedAt).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg
                              className="w-4 h-4 text-muted-foreground"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Errors</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardStats.recentErrors.length === 0 ? (
              <p className="text-muted-foreground">No recent errors.</p>
            ) : (
              <ScrollArea className="h-72 w-full">
                <div className="space-y-2 pr-2">
                  {dashboardStats.recentErrors.map((error: any) => (
                    <div
                      key={error.id}
                      className="p-4 bg-muted hover:bg-muted/70 transition-colors rounded-lg"
                    >
                      <h3 className="font-semibold text-foreground">{error.configKey}</h3>
                      <p className="text-sm text-muted-foreground">{error.error}</p>
                      <Badge variant="destructive" className="mt-2">
                        {error.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        Last Updated: {new Date(error.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
