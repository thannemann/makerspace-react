import * as React from 'react';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import Divider from '@material-ui/core/Divider';
import AssignmentIcon from '@material-ui/icons/Assignment';
import CheckIcon from '@material-ui/icons/Check';
import EventIcon from '@material-ui/icons/Event';
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
import ErrorMessage from 'ui/common/ErrorMessage';

import { VolunteerCredit, VolunteerTask, VolunteerEvent, VolunteerSummary } from 'app/entities/volunteer';
import {
  getMemberVolunteerCredits,
  getVolunteerSummary,
  getMemberVolunteerTasks,
  getMemberVolunteerEvents,
  claimVolunteerTask,
  completeVolunteerTask,
  checkinVolunteerEvent,
} from 'api/volunteer';

interface Props {
  member: Member;
}

const creditStatusLabel = (status: string): { label: string; color: Status } => {
  switch (status) {
    case 'approved':  return { label: 'Approved',          color: Status.Success };
    case 'pending':   return { label: 'Awaiting Approval', color: Status.Warn };
    case 'rejected':  return { label: 'Rejected',          color: Status.Danger };
    default:          return { label: status,              color: Status.Default };
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

// ── Credit History ────────────────────────────────────────────────────────────

const CreditHistoryInner: React.FC = () => {
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
          {row.taskTitle && <Typography variant='caption' color='textSecondary'>Task: {row.taskTitle}</Typography>}
        </div>
      ),
    },
    {
      id: 'creditValue',
      label: 'Credits',
      cell: (row: VolunteerCredit) => <Typography variant='body2'>{row.creditValue}</Typography>,
    },
    {
      id: 'date',
      label: 'Date',
      cell: (row: VolunteerCredit) => (
        <Typography variant='body2'>
          {new Date(row.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </Typography>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      cell: (row: VolunteerCredit) => {
        const s = creditStatusLabel(row.status);
        return <StatusLabel label={s.label} color={s.color} />;
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

// ── Tasks Table ───────────────────────────────────────────────────────────────

interface TasksTableProps {
  member: Member;
  onRefresh: () => void;
}

const TasksTableInner: React.FC<TasksTableProps> = ({ member, onRefresh }) => {
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  const { isRequesting, data: tasks = [], response, error, refresh } =
    useReadTransaction(getMemberVolunteerTasks, {}, undefined, 'member-volunteer-tasks');

  const refreshRef = React.useRef(refresh);
  React.useEffect(() => { refreshRef.current = refresh; }, [refresh]);

  const onSuccess = React.useCallback(() => {
    setSelectedIds([]);
    refreshRef.current();
    onRefresh();
  }, [onRefresh]);

  const { call: claimTask, isRequesting: claiming, error: claimError } = useWriteTransaction(claimVolunteerTask, onSuccess);
  const { call: markComplete, isRequesting: completing, error: completeError } = useWriteTransaction(completeVolunteerTask, onSuccess);

  const myActiveTask = (tasks as VolunteerTask[]).find(
    t => t.claimedById === member.id && ['claimed', 'pending'].includes(t.status)
  );

  const selectedTask = selectedIds.length === 1
    ? (tasks as VolunteerTask[]).find(t => t.id === selectedIds[0])
    : null;

  const columns: Column<VolunteerTask>[] = [
    {
      id: 'title',
      label: 'Task',
      defaultSortDirection: SortDirection.Asc,
      cell: (row: VolunteerTask) => (
        <div>
          <Typography variant='body2'>
            <strong>#{row.taskNumber} — {row.title}</strong>
          </Typography>
          <Typography variant='caption' color='textSecondary'>{row.description}</Typography>
          {row.shopName && (
            <Typography variant='caption' color='textSecondary' style={{ display: 'block' }}>{row.shopName}</Typography>
          )}
        </div>
      ),
    },
    {
      id: 'creditValue',
      label: 'Credits',
      cell: (row: VolunteerTask) => <Typography variant='body2'>{row.creditValue}</Typography>,
    },
    {
      id: 'status',
      label: 'Status',
      cell: (row: VolunteerTask) => {
        const s = taskStatusLabel(row.status);
        return <StatusLabel label={s.label} color={s.color} />;
      },
    },
  ];

  return (
    <Grid container spacing={2}>
      {selectedTask?.status === 'available' && !myActiveTask && (
        <Grid item xs={12}>
          <Button variant='contained' color='primary' size='small'
            disabled={claiming} startIcon={<AssignmentIcon />}
            onClick={() => claimTask({ id: selectedTask.id })}>
            Claim Task
          </Button>
          {claimError && <ErrorMessage error={claimError} />}
        </Grid>
      )}
      {selectedTask?.claimedById === member.id && selectedTask?.status === 'claimed' && (
        <Grid item xs={12}>
          <Button variant='contained' color='primary' size='small'
            disabled={completing} startIcon={<CheckIcon />}
            onClick={() => markComplete({ id: selectedTask.id })}>
            Mark Complete
          </Button>
          {completeError && <ErrorMessage error={completeError} />}
        </Grid>
      )}
      {selectedTask?.claimedById === member.id && selectedTask?.status === 'pending' && (
        <Grid item xs={12}>
          <Typography variant='body2' color='textSecondary'>Awaiting admin verification</Typography>
        </Grid>
      )}
      <Grid item xs={12}>
        <StatefulTable
          id='member-volunteer-tasks-table'
          title='Bounty Tasks'
          loading={isRequesting}
          data={tasks as VolunteerTask[]}
          error={error}
          columns={columns}
          rowId={(t: VolunteerTask) => t.id}
          totalItems={extractTotalItems(response)}
          selectedIds={selectedIds}
          setSelectedIds={(ids: unknown) => setSelectedIds(ids as string[])}
        />
      </Grid>
    </Grid>
  );
};

const TasksTable = withQueryContext(TasksTableInner);

// ── Events Table ──────────────────────────────────────────────────────────────

interface EventsTableProps {
  member: Member;
  onRefresh: () => void;
}

const EventsTableInner: React.FC<EventsTableProps> = ({ member, onRefresh }) => {
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  const { isRequesting, data: events = [], response, error, refresh } =
    useReadTransaction(getMemberVolunteerEvents, {}, undefined, 'member-volunteer-events');

  const refreshRef = React.useRef(refresh);
  React.useEffect(() => { refreshRef.current = refresh; }, [refresh]);

  const onSuccess = React.useCallback(() => {
    setSelectedIds([]);
    refreshRef.current();
    onRefresh();
  }, [onRefresh]);

  const { call: checkin, isRequesting: checkingIn, error: checkinError } = useWriteTransaction(checkinVolunteerEvent, onSuccess);

  const selectedEvent = selectedIds.length === 1
    ? (events as VolunteerEvent[]).find(e => e.id === selectedIds[0])
    : null;

  const alreadyCheckedIn = selectedEvent
    ? selectedEvent.attendeeIds.includes(member.id)
    : false;

  const columns: Column<VolunteerEvent>[] = [
    {
      id: 'title',
      label: 'Event',
      defaultSortDirection: SortDirection.Asc,
      cell: (row: VolunteerEvent) => (
        <div>
          <Typography variant='body2'>
            <strong>E{row.eventNumber} — {row.title}</strong>
          </Typography>
          {row.description && (
            <Typography variant='caption' color='textSecondary'>{row.description}</Typography>
          )}
          {row.eventDate && (
            <Typography variant='caption' color='textSecondary' style={{ display: 'block' }}>
              {new Date(row.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Typography>
          )}
        </div>
      ),
    },
    {
      id: 'creditValue',
      label: 'Credits',
      cell: (row: VolunteerEvent) => <Typography variant='body2'>{row.creditValue}</Typography>,
    },
    {
      id: 'checkedIn',
      label: 'Checked In',
      cell: (row: VolunteerEvent) => (
        <StatusLabel
          label={row.attendeeIds.includes(member.id) ? 'Yes' : 'No'}
          color={row.attendeeIds.includes(member.id) ? Status.Success : Status.Default}
        />
      ),
    },
  ];

  if ((events as VolunteerEvent[]).length === 0 && !isRequesting) return null;

  return (
    <Grid container spacing={2}>
      {selectedEvent && !alreadyCheckedIn && (
        <Grid item xs={12}>
          <Button variant='contained' color='primary' size='small'
            disabled={checkingIn} startIcon={<EventIcon />}
            onClick={() => checkin({ id: selectedEvent.id })}>
            Check In
          </Button>
          {checkinError && <ErrorMessage error={checkinError} />}
        </Grid>
      )}
      {selectedEvent && alreadyCheckedIn && (
        <Grid item xs={12}>
          <Typography variant='body2' color='textSecondary'>✅ You're checked in to this event</Typography>
        </Grid>
      )}
      <Grid item xs={12}>
        <StatefulTable
          id='member-volunteer-events-table'
          title='Open Events'
          loading={isRequesting}
          data={events as VolunteerEvent[]}
          error={error}
          columns={columns}
          rowId={(e: VolunteerEvent) => e.id}
          totalItems={extractTotalItems(response)}
          selectedIds={selectedIds}
          setSelectedIds={(ids: unknown) => setSelectedIds(ids as string[])}
        />
      </Grid>
    </Grid>
  );
};

const EventsTable = withQueryContext(EventsTableInner);

// ── Summary Banner ────────────────────────────────────────────────────────────

const SummaryBanner: React.FC<{ summary: VolunteerSummary }> = ({ summary }) => (
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
  const s = summary as VolunteerSummary | undefined;

  return (
    <Grid container spacing={3}>
      {s && (
        <Grid item xs={12}>
          <SummaryBanner summary={s} />
          <Divider />
        </Grid>
      )}

      <Grid item xs={12}>
        <EventsTable member={member} onRefresh={triggerRefresh} />
      </Grid>

      <Grid item xs={12}>
        <TasksTable member={member} onRefresh={triggerRefresh} />
      </Grid>

      <Grid item xs={12}>
        <CreditHistory />
      </Grid>
    </Grid>
  );
};

export default MemberVolunteerTab;
