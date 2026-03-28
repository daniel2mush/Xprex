"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Flag,
  MessageSquareWarning,
  Search,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { useAdminReports, useUpdateAdminReportStatus } from "@/query/AdminQuery";
import { ReportReason, ReportStatus } from "@/types/Types";
import { useUserStore } from "@/store/userStore";
import { Button } from "@/ui/Buttons/Buttons";
import { timeAgoShort } from "@/lib/ParseDate";
import { toast } from "sonner";
import styles from "./ReportsPage.module.scss";

const filters: Array<ReportStatus | "ALL"> = ["ALL", "OPEN", "REVIEWED", "DISMISSED"];
const reasonFilters: Array<ReportReason | "ALL"> = [
  "ALL",
  "SPAM",
  "ABUSE",
  "HARASSMENT",
  "MISINFORMATION",
  "IMPERSONATION",
  "OTHER",
];

export default function AdminReportsPage() {
  const { user } = useUserStore();
  const [activeFilter, setActiveFilter] = useState<ReportStatus | "ALL">("ALL");
  const [reasonFilter, setReasonFilter] = useState<ReportReason | "ALL">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
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
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredReports = reports.filter((report) => {
    if (reasonFilter !== "ALL" && report.reason !== reasonFilter) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const haystacks = [
      report.reporter.username,
      report.targetUser?.username,
      report.targetPost?.user.username,
      report.targetPost?.content,
      report.details,
      report.reason,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystacks.includes(normalizedSearch);
  });

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
          <span className={styles.heroMetric}>{filteredReports.length}</span>
          <span className={styles.heroLabel}>Filtered reports</span>
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

      <div className={styles.toolbar}>
        <label className={styles.searchBox}>
          <Search size={15} />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by reporter, target, reason, or details"
          />
        </label>

        <select
          className={styles.reasonSelect}
          value={reasonFilter}
          onChange={(event) => setReasonFilter(event.target.value as ReportReason | "ALL")}
        >
          {reasonFilters.map((reason) => (
            <option key={reason} value={reason}>
              {reason === "ALL" ? "All reasons" : reason}
            </option>
          ))}
        </select>
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

      {!isLoading && !error && filteredReports.length === 0 && (
        <div className={styles.emptyState}>
          <Flag size={30} />
          <h2>No reports in this view</h2>
          <p>Try changing the status or reason filters, or clear your search.</p>
        </div>
      )}

      <div className={styles.reportList}>
        {filteredReports.map((report) => {
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
                    }, {
                      onSuccess: () => toast.success("Report marked as reviewed"),
                      onError: (updateError) => toast.error(updateError.message),
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
                    }, {
                      onSuccess: () => toast.success("Report dismissed"),
                      onError: (updateError) => toast.error(updateError.message),
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
