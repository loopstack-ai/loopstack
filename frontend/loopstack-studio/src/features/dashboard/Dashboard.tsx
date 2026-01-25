import { Link } from 'react-router-dom';
import type { DashboardStatsDto } from '@loopstack/api-client';
import RunsList from '@/features/dashboard/RunList.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card.tsx';
import { useStudio } from '../../providers/StudioProvider.tsx';

interface DashboardProps {
  dashboardStats?: DashboardStatsDto;
}

export default function Dashboard({ dashboardStats }: DashboardProps) {
  const { router } = useStudio();

  if (!dashboardStats) {
    return <div className="p-4">No data available</div>;
  }

  return (
    <>
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="md:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link
                to={router.getWorkspaces()}
                className="text-primary hover:text-primary/80 hover:bg-muted block rounded p-2 text-sm font-medium transition-colors"
              >
                My Workspaces
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 md:col-span-3 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Executions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{dashboardStats.totalAutomationRuns}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{dashboardStats.completedRuns}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-destructive text-3xl font-bold">{dashboardStats.errorRuns}</p>
            </CardContent>
          </Card>

          {/*<Card>*/}
          {/*  <CardHeader>*/}
          {/*    <CardTitle className="text-lg">In Progress</CardTitle>*/}
          {/*  </CardHeader>*/}
          {/*  <CardContent>*/}
          {/*    <p className="text-3xl font-bold text-yellow-600">{dashboardStats.inProgressRuns}</p>*/}
          {/*  </CardContent>*/}
          {/*</Card>*/}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recently Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <RunsList type="runs" runs={dashboardStats.recentRuns} router={router} emptyMessage="No recent runs." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recently Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <RunsList
              type="errors"
              runs={dashboardStats.recentErrors}
              router={router}
              emptyMessage="No recent errors."
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
