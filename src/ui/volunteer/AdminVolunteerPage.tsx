import * as React from 'react';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';
import CheckIcon from '@material-ui/icons/Check';
import CloseIcon from '@material-ui/icons/Close';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';

import FormModal from 'ui/common/FormModal';
import ErrorMessage from 'ui/common/ErrorMessage';
import StatefulTable from 'ui/common/table/StatefulTable';
import { Column } from 'ui/common/table/Table';
import { SortDirection } from 'ui/common/table/constants';
import { withQueryContext } from 'ui/common/Filters/QueryContext';
import StatusLabel from 'ui/common/StatusLabel';
import { Status } from 'ui/constants';
import useReadTransaction from 'ui/hooks/useReadTransaction';
import useWriteTransaction from 'ui/hooks/useWriteTransaction';
import extractTotalItems from 'ui/utils/extractTotalItems';
import { useAuthState } from 'ui/reducer/hooks';
import { memberIsAdmin } from 'ui/member/utils';

import { VolunteerCredit, VolunteerTask } from 'app/entities/volunteer';
import {
  adminListVolunteerCredits,
  adminApproveVolunteerCredit,
  adminRejectVolunteerCredit,
  adminDeleteVolunteerCredit,
  adminListVolunteerTasks,
  adminCreateVolunteerTask,
  adminCompleteVolunteerTask,
  adminCancelVolunteerTask,
  adminReleaseVolunteerTask,
  adminRejectPendingVolunteerTask,
  adminDeleteVolunteerTask,
} from 'api/volunteer';

type TabKey = 'credits' | 'tasks';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'credits', label: 'Credits' },
  { key: 'tasks',   label: 'Bounty Tasks' },
];

// ── Status helpers ────────────────────────────────────────────────────────────

const creditStatusLabel = (status: string): { label: string; color: Status } => {
  switch (status) {
    case 'approved':  return { label: 'Approved',  color: Status.Success };
    case 'pending':   return { label: 'Pending',   color: Status.Warn };
    case 'rejected':  return { label: 'Rejected',  color: Status.Danger };
    default:          return { label: status,      color: Status.Default };
  }
};

const taskStatusLabel = (status: string): { label: string; color: Status } => {
  switch (status) {
    case 'available':  return { label: 'Available',           color: Status.Success };
    case 'claimed':    return { label: 'Claimed',             color: Status.Info };
    case 'pending':    return { label: 'Pending Verification', color: Status.Warn };
    case 'completed':  return { label: 'Completed',           color: Status.Primary };
    case 'cancelled':  return { label: 'Cancelled',           color: Status.Danger };
    default:           return { label: status,                color: Status.Default };
  }
};

// ── Reason Modal ──────────────────────────────────────────────────────────────

interface ReasonModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  loading: boolean;
  error: string;
}

const ReasonModal: React.FC<ReasonModalProps> = ({ title, isOpen, onClose, onSubmit, loading, error }) => {
  const [reason, setReason] = React.useState('');
  React.useEffect(() => { if (!isOpen) setReason(''); }, [isOpen]);

  return (
    <FormModal
      id='volunteer-reason'
      title={title}
      isOpen={isOpen}
      closeHandler={onClose}
      onSubmit={() => reason.trim() && onSubmit(reason)}
      loading={loading}
      error={error}
    >
      <TextField
        label='Reason'
        value={reason}
        onChange={e => setReason(e.target.value)}
        fullWidth
        required
        multiline
        rows={2}
        autoFocus
      />
    </FormModal>
  );
};

// ── Create Task Modal ─────────────────────────────────────────────────────────

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: { title: string; description: string; creditValue: number }) => void;
  loading: boolean;
  error: string;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ isOpen, onClose, onSave, loading, error }) => {
  const [title, setTitle]             = React.useState('');
  const [description, setDescription] = React.useState('');
  const [creditValue, setCreditValue] = React.useState('1');

  React.useEffect(() => {
    if (!isOpen) { setTitle(''); setDescription(''); setCreditValue('1'); }
  }, [isOpen]);

  return (
    <FormModal
      id='create-volunteer-task'
      title='Create Bounty Task'
      isOpen={isOpen}
      closeHandler={onClose}
      onSubmit={() => title && description && onSave({ title, description, creditValue: parseFloat(creditValue) || 1 })}
      loading={loading}
      error={error}
    >
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField label='Title' value={title} onChange={e => setTitle(e.target.value)} fullWidth required autoFocus />
        </Grid>
        <Grid item xs={12}>
          <TextField label='Description' value={description} onChange={e => setDescription(e.target.value)} fullWidth multiline rows={3} required />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label='Credit Value'
            value={creditValue}
            onChange={e => setCreditValue(e.target.value)}
            type='number'
            inputProps={{ min: 0.5, max: 2, step: 0.5 }}
            fullWidth
            required
            helperText='Max 2 credits per task'
          />
        </Grid>
      </Grid>
    </FormModal>
  );
};

// ── Credits Tab ───────────────────────────────────────────────────────────────

const CreditsTabInner: React.FC = () => {
  const { currentUser } = useAuthState();
  const isAdmin = memberIsAdmin(currentUser);

  const { isRequesting, data: credits = [], response, refresh, error: loadError } =
    useReadTransaction(adminListVolunteerCredits, {}, undefined, 'volunteer-credits');

  const refreshRef = React.useRef(refresh);
  React.useEffect(() => { refreshRef.current = refresh; }, [refresh]);
  const onSuccess = React.useCallback(() => refreshRef.current(), []);

  const { call: approveCredit } = useWriteTransaction(adminApproveVolunteerCredit, onSuccess);
  const { call: rejectCredit }  = useWriteTransaction(adminRejectVolunteerCredit, onSuccess);
  const { call: deleteCredit }  = useWriteTransaction(adminDeleteVolunteerCredit, onSuccess);

  const columns: Column<VolunteerCredit>[] = [
    {
      id: 'member',
      label: 'Member',
      defaultSortDirection: SortDirection.Asc,
      cell: (row: VolunteerCredit) => (
        <div>
          <Typography variant='body2'><strong>{row.memberName}</strong></Typography>
          <Typography variant='caption' color='textSecondary'>
            {new Date(row.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {row.issuedByName && ` — ${row.issuedByName}`}
          </Typography>
        </div>
      ),
    },
    {
      id: 'description',
      label: 'Description',
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
    {
      id: 'actions',
      label: '',
      cell: (row: VolunteerCredit) => (
        <div style={{ display: 'flex', gap: 4 }}>
          {row.status === 'pending' && (
            <>
              <Tooltip title='Approve'>
                <IconButton size='small' onClick={e => { e.stopPropagation(); approveCredit({ id: row.id }); }}>
                  <CheckIcon fontSize='small' />
                </IconButton>
              </Tooltip>
              <Tooltip title='Reject'>
                <IconButton size='small' onClick={e => { e.stopPropagation(); rejectCredit({ id: row.id }); }}>
                  <CloseIcon fontSize='small' />
                </IconButton>
              </Tooltip>
            </>
          )}
          {isAdmin && (
            <Tooltip title='Delete'>
              <IconButton size='small' color='secondary' onClick={e => { e.stopPropagation(); deleteCredit({ id: row.id }); }}>
                <DeleteIcon fontSize='small' />
              </IconButton>
            </Tooltip>
          )}
        </div>
      ),
    },
  ];

  return (
    <Grid container spacing={3}>
      {loadError && <Grid item xs={12}><ErrorMessage error={loadError} /></Grid>}
      <Grid item xs={12}>
        <StatefulTable
          id='volunteer-credits-table'
          title='Volunteer Credits'
          loading={isRequesting}
          data={credits as VolunteerCredit[]}
          error={loadError}
          columns={columns}
          rowId={(c: VolunteerCredit) => c.id}
          totalItems={extractTotalItems(response)}
          selectedIds={undefined}
          setSelectedIds={() => {}}
          renderSearch={true}
        />
      </Grid>
    </Grid>
  );
};

const CreditsTab = withQueryContext(CreditsTabInner);

// ── Tasks Tab ─────────────────────────────────────────────────────────────────

const TasksTabInner: React.FC = () => {
  const { currentUser } = useAuthState();
  const isAdmin = memberIsAdmin(currentUser);

  const [createOpen, setCreateOpen]   = React.useState(false);
  const [releaseTarget, setRelease]   = React.useState<string | null>(null);
  const [rejectTarget, setReject]     = React.useState<string | null>(null);

  const { isRequesting, data: tasks = [], response, refresh, error: loadError } =
    useReadTransaction(adminListVolunteerTasks, {}, undefined, 'volunteer-tasks');

  const refreshRef = React.useRef(refresh);
  React.useEffect(() => { refreshRef.current = refresh; }, [refresh]);

  const onSuccess = React.useCallback(() => {
    setCreateOpen(false);
    setRelease(null);
    setReject(null);
    refreshRef.current();
  }, []);

  const { call: createTask, isRequesting: creating, error: createError } =
    useWriteTransaction(adminCreateVolunteerTask, onSuccess);
  const { call: completeTask } = useWriteTransaction(adminCompleteVolunteerTask, onSuccess);
  const { call: cancelTask }   = useWriteTransaction(adminCancelVolunteerTask, onSuccess);
  const { call: deleteTask }   = useWriteTransaction(adminDeleteVolunteerTask, onSuccess);
  const { call: releaseTask, isRequesting: releasing, error: releaseError } =
    useWriteTransaction(adminReleaseVolunteerTask, onSuccess);
  const { call: rejectTask, isRequesting: rejecting, error: rejectError } =
    useWriteTransaction(adminRejectPendingVolunteerTask, onSuccess);

  const columns: Column<VolunteerTask>[] = [
    {
      id: 'title',
      label: 'Task',
      defaultSortDirection: SortDirection.Asc,
      cell: (row: VolunteerTask) => (
        <div>
          <Typography variant='body2'><strong>{row.title}</strong></Typography>
          <Typography variant='caption' color='textSecondary'>{row.description}</Typography>
          {row.claimedByName && (
            <Typography variant='caption' color='textSecondary' style={{ display: 'block' }}>
              Claimed by: {row.claimedByName}
            </Typography>
          )}
          {row.rejectionReason && (
            <Typography variant='caption' color='error' style={{ display: 'block' }}>
              Reason: {row.rejectionReason}
            </Typography>
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
    {
      id: 'actions',
      label: '',
      cell: (row: VolunteerTask) => (
        <div style={{ display: 'flex', gap: 4 }}>
          {row.status === 'pending' && (
            <>
              <Tooltip title='Verify Complete'>
                <IconButton size='small' onClick={e => { e.stopPropagation(); completeTask({ id: row.id }); }}>
                  <CheckIcon fontSize='small' />
                </IconButton>
              </Tooltip>
              <Tooltip title='Reject'>
                <IconButton size='small' onClick={e => { e.stopPropagation(); setReject(row.id); }}>
                  <CloseIcon fontSize='small' />
                </IconButton>
              </Tooltip>
            </>
          )}
          {row.status === 'claimed' && (
            <Tooltip title='Release Task'>
              <IconButton size='small' onClick={e => { e.stopPropagation(); setRelease(row.id); }}>
                <CloseIcon fontSize='small' />
              </IconButton>
            </Tooltip>
          )}
          {row.status === 'available' && (
            <Tooltip title='Cancel Task'>
              <IconButton size='small' color='secondary' onClick={e => { e.stopPropagation(); cancelTask({ id: row.id }); }}>
                <CloseIcon fontSize='small' />
              </IconButton>
            </Tooltip>
          )}
          {isAdmin && ['completed', 'cancelled'].includes(row.status) && (
            <Tooltip title='Delete'>
              <IconButton size='small' color='secondary' onClick={e => { e.stopPropagation(); deleteTask({ id: row.id }); }}>
                <DeleteIcon fontSize='small' />
              </IconButton>
            </Tooltip>
          )}
        </div>
      ),
    },
  ];

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Grid container justify='space-between' alignItems='center'>
          <div />
          <Button variant='contained' color='primary' startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            Create Task
          </Button>
        </Grid>
      </Grid>

      {loadError && <Grid item xs={12}><ErrorMessage error={loadError} /></Grid>}

      <Grid item xs={12}>
        <StatefulTable
          id='volunteer-tasks-table'
          title='Bounty Tasks'
          loading={isRequesting}
          data={tasks as VolunteerTask[]}
          error={loadError}
          columns={columns}
          rowId={(t: VolunteerTask) => t.id}
          totalItems={extractTotalItems(response)}
          selectedIds={undefined}
          setSelectedIds={() => {}}
          renderSearch={true}
        />
      </Grid>

      <CreateTaskModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={task => createTask({ body: { title: task.title, description: task.description, creditValue: task.creditValue } })}
        loading={creating}
        error={createError}
      />

      <ReasonModal
        title='Release Task'
        isOpen={!!releaseTarget}
        onClose={() => setRelease(null)}
        onSubmit={reason => releaseTask({ id: releaseTarget, reason })}
        loading={releasing}
        error={releaseError}
      />

      <ReasonModal
        title='Reject Task Completion'
        isOpen={!!rejectTarget}
        onClose={() => setReject(null)}
        onSubmit={reason => rejectTask({ id: rejectTarget, reason })}
        loading={rejecting}
        error={rejectError}
      />
    </Grid>
  );
};

const TasksTab = withQueryContext(TasksTabInner);

// ── Main Page ─────────────────────────────────────────────────────────────────

const AdminVolunteerPage: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<TabKey>('credits');

  return (
    <Grid container spacing={3} justify='center'>
      <Grid item md={10} xs={12}>
        <Typography variant='h5' gutterBottom>Volunteer</Typography>
        <Typography variant='body2' color='textSecondary'>
          Manage volunteer credits and bounty tasks.
        </Typography>
      </Grid>

      <Grid item md={10} xs={12}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val as TabKey)}
          indicatorColor='primary'
          textColor='primary'
          variant='scrollable'
          scrollButtons='auto'
        >
          {TABS.map(t => (
            <Tab key={t.key} id={`volunteer-tab-${t.key}`} value={t.key} label={t.label} />
          ))}
        </Tabs>
      </Grid>

      <Grid item md={10} xs={12}>
        {activeTab === 'credits' && <CreditsTab />}
        {activeTab === 'tasks'   && <TasksTab />}
      </Grid>
    </Grid>
  );
};

export default AdminVolunteerPage;
