"use client";

import { useState } from "react";
import Link from "next/link";
import { Flag, MessageSquareWarning, ShieldAlert, UserRound } from "lucide-react";
import { useAdminReports, useUpdateAdminReportStatus } from "@/query/AdminQuery";
import { ReportStatus } from "@/types/Types";
import { useUserStore } from "@/store/userStore";
import { Button } from "@/ui/Buttons/Buttons";
import { timeAgoShort } from "@/lib/ParseDate";
import styles from "./ReportsPage.module.scss";

const filters: Array<ReportStatus | "ALL"> = ["ALL", "OPEN", "REVIEWED", "DISMISSED"];

export default function AdminReportsPage() {
  const { user } = useUserStore();
  const [activeFilter, setActiveFilter] = useState<ReportStatus | "ALL">("ALL");
  const { data, isLoading, error } = useAdminReports(activeFilter);
  const { mutate: updateStatus, isPending } = useUpdateAdminReportStatus();

  if (!user?.isAdmin) {
    return (
      <section className={styles.lockedState}>
        <ShieldAlert size={32} />
        <h1>Admin access required</h1>
        <p>This moderation inbox is only available to admin accounts.</p>
      </section>
    );
  }

  const reports = data?.data.reports ?? [];

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Moderation</p>
          <h1>Reports dashboard</h1>
          <p className={styles.heroBody}>
            Review incoming user and post reports, then move them through the
            moderation queue.
          </p>
        </div>
        <div className={styles.heroCard}>
          <span className={styles.heroMetric}>{reports.length}</span>
          <span className={styles.heroLabel}>Visible reports</span>
        </div>
      </div>

      <div className={styles.filters}>
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            className={`${styles.filterChip} ${
              activeFilter === filter ? styles.filterChipActive : ""
            }`}
            onClick={() => setActiveFilter(filter)}
          >
            {filter === "ALL" ? "All reports" : filter.toLowerCase()}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className={styles.emptyState}>
          <p>Loading reports...</p>
        </div>
      )}

      {!isLoading && error && (
        <div className={styles.emptyState}>
          <p>{error.message}</p>
        </div>
      )}

      {!isLoading && !error && reports.length === 0 && (
        <div className={styles.emptyState}>
          <Flag size={30} />
          <h2>No reports in this view</h2>
          <p>Once people flag posts or accounts, they will show up here.</p>
        </div>
      )}

      <div className={styles.reportList}>
        {reports.map((report) => {
          const isUserReport = Boolean(report.targetUser);
          const reportTarget = isUserReport ? report.targetUser : report.targetPost;

          return (
            <article key={report.id} className={styles.reportCard}>
              <div className={styles.reportTopRow}>
                <div className={styles.badgeRow}>
                  <span className={styles.reasonBadge}>{report.reason}</span>
                  <span
                    className={`${styles.statusBadge} ${
                      report.status === "OPEN"
                        ? styles.statusOpen
                        : report.status === "REVIEWED"
                          ? styles.statusReviewed
                          : styles.statusDismissed
                    }`}
                  >
                    {report.status}
                  </span>
                </div>
                <span className={styles.reportTime}>
                  {timeAgoShort(new Date(report.createdAt))}
                </span>
              </div>

              <div className={styles.reportBody}>
                <div className={styles.reportMeta}>
                  <div className={styles.metaItem}>
                    <UserRound size={14} />
                    <span>Reporter: @{report.reporter.username}</span>
                  </div>
                  <div className={styles.metaItem}>
                    {isUserReport ? <ShieldAlert size={14} /> : <MessageSquareWarning size={14} />}
                    <span>
                      {isUserReport
                        ? `Account: @${reportTarget?.username ?? "Unknown"}`
                        : `Post by @${reportTarget?.user.username ?? "Unknown"}`}
                    </span>
                  </div>
                </div>

                {report.details && <p className={styles.details}>{report.details}</p>}

                {isUserReport && report.targetUser && (
                  <Link href={`/profile/${report.targetUser.id}`} className={styles.targetLink}>
                    Open profile
                  </Link>
                )}

                {!isUserReport && report.targetPost && (
                  <div className={styles.postPreview}>
                    <p>{report.targetPost.content}</p>
                    <Link href={`/profile/${report.targetPost.user.id}`} className={styles.targetLink}>
                      View author
                    </Link>
                  </div>
                )}
              </div>

              <div className={styles.actions}>
                <Button
                  variant="outline"
                  disabled={report.status === "REVIEWED"}
                  isLoading={isPending}
                  onClick={() =>
                    updateStatus({
                      reportId: report.id,
                      status: "REVIEWED",
                    })
                  }
                >
                  Mark reviewed
                </Button>
                <Button
                  variant="ghost"
                  disabled={report.status === "DISMISSED"}
                  isLoading={isPending}
                  onClick={() =>
                    updateStatus({
                      reportId: report.id,
                      status: "DISMISSED",
                    })
                  }
                >
                  Dismiss
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
