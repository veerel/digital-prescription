import { CalendarCheck, FileText, Stethoscope, Users } from "lucide-react";
import { Link } from "react-router";

import { errorMessage } from "@/api/errors";
import { Alert } from "@/components/ui/Alert";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { useAuth } from "@/features/auth/AuthContext";
import { formatWeekday, parseDate } from "@/lib/formatters";

import { useActivities, useDashboard } from "./api";
import { TopDiagnosesChart, VisitsChart } from "./Charts";
import styles from "./DashboardPage.module.css";
import { FollowUpsList } from "./FollowUpsList";
import { RecentActivityFeed } from "./RecentActivityFeed";

function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function DashboardPage() {
  const { user } = useAuth();
  const summary = useDashboard();
  const activities = useActivities(6);
  const now = new Date();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.greeting}>
            {greeting(now)}, {user?.full_name ?? "Doctor"}
          </h2>
          <p className={styles.date}>
            {parseDate(summary.data?.today ?? now).toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {summary.error && <Alert>{errorMessage(summary.error)}</Alert>}

      <div className={styles.statGrid}>
        <StatCard
          label="Total Patients"
          value={summary.data?.total_patients ?? "–"}
          icon={<Users size={20} />}
        />
        <StatCard
          label="Today's Visits"
          value={summary.data?.todays_visits ?? "–"}
          icon={<CalendarCheck size={20} />}
        />
        <StatCard
          label="Prescriptions This Month"
          value={summary.data?.prescriptions_this_month ?? "–"}
          icon={<FileText size={20} />}
        />
        <StatCard
          label="Active Doctors"
          value={summary.data?.active_doctors ?? "–"}
          icon={<Stethoscope size={20} />}
        />
      </div>

      <div className={styles.grid}>
        <div className={styles.col}>
          <Card>
            <CardHeader title="Visits this week" subtitle="Consultations recorded per day" />
            <VisitsChart
              data={(summary.data?.visits_per_day ?? []).map((d) => ({
                label: formatWeekday(d.date),
                count: d.count,
              }))}
            />
          </Card>

          <Card>
            <CardHeader title="Top diagnoses" subtitle="Most common reasons for visits" />
            {summary.data && <TopDiagnosesChart data={summary.data.top_diagnoses} />}
          </Card>
        </div>

        <div className={styles.col}>
          <Card>
            <CardHeader title="Follow-ups due soon" subtitle="Next 14 days" />
            {summary.isPending ? (
              <p className="loading">Loading…</p>
            ) : (
              summary.data && (
                <FollowUpsList followUps={summary.data.follow_ups} today={summary.data.today} />
              )
            )}
          </Card>

          <Card>
            <CardHeader
              title="Recent activity"
              action={
                <Link to="/visits" className={styles.viewAll}>
                  View all visits
                </Link>
              }
            />
            {activities.error && <Alert>{errorMessage(activities.error)}</Alert>}
            {activities.data && <RecentActivityFeed activities={activities.data} />}
          </Card>
        </div>
      </div>
    </div>
  );
}
