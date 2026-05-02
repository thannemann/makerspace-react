import * as React from 'react';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';
import Divider from '@material-ui/core/Divider';
import AssignmentIcon from '@material-ui/icons/Assignment';
import CheckIcon from '@material-ui/icons/Check';
import { Member } from 'makerspace-ts-api-client';

import StatefulTable from 'ui/common/table/StatefulTable';
import { Column } from 'ui/common/table/Table';
import { SortDirection } from 'ui/common/table/constants';
import { withQueryContext } from 'ui/common/Filters/QueryContext';
import StatusLabel from 'ui/common/StatusLabel';
import { Status } from 'ui/constants';
import useReadTransaction from 'ui/hooks/useReadTransaction';
import useWriteTransaction from 'ui/hooks/useWriteTransaction';
import extractTotalItems from 'ui/utils/extractTotalItems';

import { VolunteerCredit, VolunteerTask, VolunteerSummary } from 'app/entities/volunteer';
import {
  getMemberVolunteerCredits,
  getVolunteerSummary,
  getMemberVolunteerTasks,
  claimVolunteerTask,
  completeVolunteerTask,
} from 'api/volunteer';

interface Props {
  member: Member;
}

const creditStatusLabel = (status: string): { label: string; color: Status } => {
  switch (status) {
    case 'approved':  return { label: 'Approved',         color: Status.Success };
    case 'pending':   return { label: 'Awaiting Approval', color: Status.Warn };
    case 'rejected':  return { label: 'Rejected',         color: Status.Danger };
    default:          return { label: status,             color: Status.Default };
  }
};

const taskStatusLabel = (status: string): { label: string; color: Status } => {
  switch (status) {
    case 'available': return { label: 'Available',            color: Status.Success };
    case 'claimed':   return { label: 'Claimed',              color: Status.Info };
    case 'pending':   return { label: 'Pending Verification', color: Status.Warn };
    case 'completed': return { label: 'Completed',            color: Status.Primary };
    case 'cancelled': return { label: 'Cancelled',            color: Status.Danger };
    default:          return { label: status,                 color: Status.Default };
  }
};

// ── Credit History Table ──────────────────────────────────────────────────────

interface CreditHistoryProps {
  member: Member;
}

const CreditHistoryInner: React.FC<CreditHistoryProps> = ({ member }) => {
  const { isRequesting, data: credits = [], response, error } =
    useReadTransaction(getMemberVolunteerCredits, {}, undefined, 'member-volunteer-credits');

  const columns: Column<VolunteerCredit>[] = [
    {
      id: 'description',
      label: 'Description',
      defaultSortDirection: SortDirection.Asc,
      cell: (row: VolunteerCredit) => (
        <div>
          <Typography variant='body2'>{row.description}</Typography>
          {row.taskTitle && (
            <Typography variant='caption' color='textSecondary'>Task: {row.taskTitle}</Typography>
          )}
        </div>
      ),
    },
    {
      id: 'creditValue',
      label: 'Credits',
      cell: (row: VolunteerCredit) => (
        <Typography variant='body2'>{row.creditValue}</Typography>
      ),
    },
    {
      id: 'date',
      label: 'Date',
      cell: (row: VolunteerCredit) => (
        <Typography variant='body2'>
          {new Date(row.createdAt).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
          })}
        </Typography>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      cell: (row: VolunteerCredit) => {
        const s = creditStatusLabel(row.status);
        return (
          <div>
            <StatusLabel label={s.label} color={s.color} />
            {row.discountApplied && (
              <div><StatusLabel label='Discount Applied' color={Status.Primary} /></div>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <StatefulTable
      id='member-volunteer-credits-table'
      title='Credit History'
      loading={isRequesting}
      data={credits as VolunteerCredit[]}
      error={error}
      columns={columns}
      rowId={(c: VolunteerCredit) => c.id}
      totalItems={extractTotalItems(response)}
      selectedIds={undefined}
      setSelectedIds={() => {}}
    />
  );
};

const CreditHistory = withQueryContext(CreditHistoryInner);

// ── Available Tasks Table ─────────────────────────────────────────────────────

interface AvailableTasksProps {
  member: Member;
  onClaim: () => void;
  onComplete: () => void;
}

const AvailableTasksInner: React.FC<AvailableTasksProps> = ({ member, onClaim, onComplete }) => {
  const { isRequesting, data: tasks = [], response, error, refresh } =
    useReadTransaction(getMemberVolunteerTasks, {}, undefined, 'member-volunteer-tasks');

  const refreshRef = React.useRef(refresh);
  React.useEffect(() => { refreshRef.current = refresh; }, [refresh]);

  const onSuccess = React.useCallback(() => {
    refreshRef.current();
    onClaim();
    onComplete();
  }, [onClaim, onComplete]);

  const { call: claimTask, isRequesting: claiming } = useWriteTransaction(claimVolunteerTask, onSuccess);
  const { call: markComplete, isRequesting: completing } = useWriteTransaction(completeVolunteerTask, onSuccess);

  const myActiveTask = (tasks as VolunteerTask[]).find(
    t => t.claimedById === member.id && ['claimed', 'pending'].includes(t.status)
  );

  const columns: Column<VolunteerTask>[] = [
    {
      id: 'title',
      label: 'Task',
      defaultSortDirection: SortDirection.Asc,
      cell: (row: VolunteerTask) => (
        <div>
          <Typography variant='body2'><strong>#{row.taskNumber} — {row.title}</strong></Typography>
          <Typography variant='caption' color='textSecondary'>{row.description}</Typography>
          {row.shopName && (
            <Typography variant='caption' color='textSecondary' style={{ display: 'block' }}>
              {row.shopName}
            </Typography>
          )}
        </div>
      ),
    },
    {
      id: 'creditValue',
      label: 'Credits',
      cell: (row: VolunteerTask) => (
        <Typography variant='body2'>{row.creditValue}</Typography>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      cell: (row: VolunteerTask) => {
        const s = taskStatusLabel(row.status);
        return <StatusLabel label={s.label} color={s.color} />;
      },
    },
    {
      id: 'actions',
      label: '',
      cell: (row: VolunteerTask) => {
        if (row.status === 'available' && !myActiveTask) {
          return (
            <Tooltip title='Claim this task'>
              <Button
                size='small'
                variant='outlined'
                color='primary'
                disabled={claiming}
                startIcon={<AssignmentIcon fontSize='small' />}
                onClick={e => { e.stopPropagation(); claimTask({ id: row.id }); }}
              >
                Claim
              </Button>
            </Tooltip>
          );
        }
        if (row.claimedById === member.id && row.status === 'claimed') {
          return (
            <Tooltip title='Mark as complete'>
              <Button
                size='small'
                variant='contained'
                color='primary'
                disabled={completing}
                startIcon={<CheckIcon fontSize='small' />}
                onClick={e => { e.stopPropagation(); markComplete({ id: row.id }); }}
              >
                Mark Complete
              </Button>
            </Tooltip>
          );
        }
        if (row.claimedById === member.id && row.status === 'pending') {
          return <Typography variant='caption' color='textSecondary'>Awaiting verification</Typography>;
        }
        return null;
      },
    },
  ];

  return (
    <StatefulTable
      id='member-volunteer-tasks-table'
      title='Bounty Tasks'
      loading={isRequesting}
      data={tasks as VolunteerTask[]}
      error={error}
      columns={columns}
      rowId={(t: VolunteerTask) => t.id}
      totalItems={extractTotalItems(response)}
      selectedIds={undefined}
      setSelectedIds={() => {}}
    />
  );
};

const AvailableTasks = withQueryContext(AvailableTasksInner);

// ── Summary Banner ────────────────────────────────────────────────────────────

interface SummaryBannerProps {
  summary: VolunteerSummary & { discount_active?: boolean };
}

const SummaryBanner: React.FC<SummaryBannerProps> = ({ summary }) => (
  <Grid container spacing={2} style={{ marginBottom: 8 }}>
    <Grid item xs={12} sm={4}>
      <Typography variant='h6' color='primary'>{summary.year_count}</Typography>
      <Typography variant='body2' color='textSecondary'>Credits this year</Typography>
    </Grid>
    {summary.discount_active && (
      <Grid item xs={12} sm={4}>
        <Typography variant='h6'>{summary.discounts_used} / {summary.max_discounts}</Typography>
        <Typography variant='body2' color='textSecondary'>Discounts applied</Typography>
      </Grid>
    )}
    {summary.pending_count > 0 && (
      <Grid item xs={12} sm={4}>
        <Typography variant='h6'>{summary.pending_count}</Typography>
        <Typography variant='body2' color='textSecondary'>Pending approval</Typography>
      </Grid>
    )}
    {summary.discount_active && summary.message && (
      <Grid item xs={12}>
        <Typography variant='body2' color='primary'>{summary.message}</Typography>
      </Grid>
    )}
  </Grid>
);

// ── Main Tab ──────────────────────────────────────────────────────────────────

const MemberVolunteerTab: React.FC<Props> = ({ member }) => {
  const [refreshKey, setRefreshKey] = React.useState(0);
  const triggerRefresh = React.useCallback(() => setRefreshKey(k => k + 1), []);

  const { data: summary } = useReadTransaction(getVolunteerSummary, {}, undefined, `volunteer-summary-${refreshKey}`);
  const s = summary as VolunteerSummary & { discount_active?: boolean } | undefined;

  return (
    <Grid container spacing={3}>
      {s && (
        <Grid item xs={12}>
          <SummaryBanner summary={s} />
          <Divider />
        </Grid>
      )}

      <Grid item xs={12}>
        <AvailableTasks member={member} onClaim={triggerRefresh} onComplete={triggerRefresh} />
      </Grid>

      <Grid item xs={12}>
        <CreditHistory member={member} />
      </Grid>
    </Grid>
  );
};

export default MemberVolunteerTab;
