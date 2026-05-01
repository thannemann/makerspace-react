import * as React from "react";
import {
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Switch,
  FormControlLabel,
  Button,
  Chip,
  CircularProgress,
  Divider,
} from "@material-ui/core";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import ErrorIcon from "@material-ui/icons/Error";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";

import {
  getSystemConfigs,
  updateSystemFlag,
  runSystemJob,
  SystemConfigData,
  JobStatus,
} from "api/systemConfig";

const JOB_LABELS: Record<string, string> = {
  slack_sync:      "Slack User Sync",
  member_review:   "Member Review",
  invoice_review:  "Invoice Review",
  garbage_collect: "Garbage Collector",
  db_backup:       "Database Backup",
};

const JOB_DESCRIPTIONS: Record<string, string> = {
  slack_sync:      "Syncs Slack workspace users to member records by matching email addresses.",
  member_review:   "Reviews membership statuses and sends a weekly summary report to Slack.",
  invoice_review:  "Reviews invoice statuses, flags past due accounts, and reports to the treasurer channel.",
  garbage_collect: "Cleans up old Redis invoicing cache keys from the previous month.",
  db_backup:       "Backs up the MongoDB database to Google Drive.",
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return "Never";
  return new Date(dateStr).toLocaleString("en-US", {
    month:  "short",
    day:    "numeric",
    year:   "numeric",
    hour:   "numeric",
    minute: "2-digit",
  });
};

const SystemSettings: React.FC = () => {
  const [config, setConfig]             = React.useState<SystemConfigData | null>(null);
  const [loading, setLoading]           = React.useState(true);
  const [error, setError]               = React.useState<string | null>(null);
  const [togglingFlag, setTogglingFlag] = React.useState<string | null>(null);
  const [runningJob, setRunningJob]     = React.useState<string | null>(null);
  const [jobMessage, setJobMessage]     = React.useState<Record<string, string>>({});

  const loadConfig = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await getSystemConfigs();
    if (err) {
      setError("Failed to load system configuration.");
    } else {
      setConfig(data);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => { loadConfig(); }, [loadConfig]);

  const handleToggleFlag = React.useCallback(async (key: string, current: boolean) => {
    setTogglingFlag(key);
    const { error: err } = await updateSystemFlag({ key, value: !current });
    if (!err && config) {
      setConfig({
        ...config,
        flags: { ...config.flags, [key]: !current },
      });
    }
    setTogglingFlag(null);
  }, [config]);

  const handleRunJob = React.useCallback(async (jobKey: string) => {
    setRunningJob(jobKey);
    setJobMessage(prev => ({ ...prev, [jobKey]: "" }));
    const { data, error: err } = await runSystemJob({ key: jobKey });
    if (err) {
      setJobMessage(prev => ({ ...prev, [jobKey]: "Failed to enqueue job." }));
    } else {
      setJobMessage(prev => ({ ...prev, [jobKey]: data?.message || "Job enqueued." }));
    }
    setRunningJob(null);
  }, []);

  if (loading) {
    return (
      <Grid container justify="center" style={{ padding: 48 }}>
        <CircularProgress />
      </Grid>
    );
  }

  if (error || !config) {
    return (
      <Grid container justify="center" style={{ padding: 48 }}>
        <Typography color="error">{error || "Unable to load configuration."}</Typography>
      </Grid>
    );
  }

  return (
    <Grid container spacing={3} style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <Grid item xs={12}>
        <Typography variant="h5" gutterBottom>
          System Settings
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Manage feature flags and scheduled jobs. Changes take effect immediately.
        </Typography>
      </Grid>

      {/* Feature Flags */}
      <Grid item xs={12}>
        <Card>
          <CardHeader title="Feature Flags" />
          <Divider />
          <CardContent>
            <FormControlLabel
              control={
                <Switch
                  checked={config.flags.slack_sync_enabled}
                  onChange={() => handleToggleFlag("slack_sync_enabled", config.flags.slack_sync_enabled)}
                  disabled={togglingFlag === "slack_sync_enabled"}
                  color="primary"
                />
              }
              label={
                <span>
                  <Typography variant="body1" component="span">Slack User Sync</Typography>
                  <Typography variant="body2" color="textSecondary" component="p">
                    Automatically sync Slack workspace users to member records nightly at 3am.
                  </Typography>
                </span>
              }
            />
          </CardContent>
        </Card>
      </Grid>

      {/* Scheduled Jobs */}
      <Grid item xs={12}>
        <Card>
          <CardHeader title="Scheduled Jobs" />
          <Divider />
          <CardContent>
            <Grid container spacing={2}>
              {config.jobs.map((job: JobStatus) => (
                <Grid item xs={12} key={job.key}>
                  <Grid container alignItems="center" spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body1">
                        {JOB_LABELS[job.key] || job.key}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {JOB_DESCRIPTIONS[job.key] || job.task}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={3}>
                      <Typography variant="caption" color="textSecondary">
                        Last run
                      </Typography>
                      <Typography variant="body2">
                        {formatDate(job.last_run_at)}
                      </Typography>
                    </Grid>

                    <Grid item xs={6} sm={2}>
                      {job.last_run_status === "success" && (
                        <Chip
                          icon={<CheckCircleIcon />}
                          label="Success"
                          size="small"
                          style={{ backgroundColor: "#e8f5e9", color: "#2e7d32" }}
                        />
                      )}
                      {job.last_run_status === "failure" && (
                        <Chip
                          icon={<ErrorIcon />}
                          label="Failed"
                          size="small"
                          style={{ backgroundColor: "#ffebee", color: "#c62828" }}
                        />
                      )}
                      {!job.last_run_status && (
                        <Chip label="No data" size="small" />
                      )}
                    </Grid>

                    <Grid item xs={6} sm={3}>
                      <Button
                        variant="outlined"
                        size="small"
                        color="primary"
                        startIcon={
                          runningJob === job.key
                            ? <CircularProgress size={14} />
                            : <PlayArrowIcon />
                        }
                        disabled={!!runningJob}
                        onClick={() => handleRunJob(job.key)}
                      >
                        Run Now
                      </Button>
                      {jobMessage[job.key] && (
                        <Typography variant="caption" color="textSecondary" display="block" style={{ marginTop: 4 }}>
                          {jobMessage[job.key]}
                        </Typography>
                      )}
                    </Grid>
                  </Grid>
                  <Divider style={{ marginTop: 12 }} />
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default SystemSettings;
