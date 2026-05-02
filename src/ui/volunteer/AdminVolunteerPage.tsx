import * as React from 'react';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Button from '@material-ui/core/Button';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Chip from '@material-ui/core/Chip';
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';
import TextField from '@material-ui/core/TextField';
import CircularProgress from '@material-ui/core/CircularProgress';
import CheckIcon from '@material-ui/icons/Check';
import CloseIcon from '@material-ui/icons/Close';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';

import useReadTransaction from 'ui/hooks/useReadTransaction';
import useWriteTransaction from 'ui/hooks/useWriteTransaction';
import ErrorMessage from 'ui/common/ErrorMessage';
import FormModal from 'ui/common/FormModal';
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

const statusLabel = (status: string): string => {
  switch (status) {
    case 'pending':   return 'Awaiting Approval';
    case 'approved':  return 'Approved';
    case 'rejected':  return 'Rejected';
    case 'available': return 'Available';
    case 'claimed':   return 'Claimed';
    case 'pending':   return 'Pending Verification';
    case 'completed': return 'Completed';
    case 'cancelled': return 'Cancelled';
    default:          return status;
  }
};

const statusColor = (status: string): 'default' | 'primary' | 'secondary' => {
  switch (status) {
    case 'approved':
    case 'completed':
    case 'available': return 'primary';
    case 'rejected':
    case 'cancelled': return 'secondary';
    default:          return 'default';
  }
};

// ── Credits Tab ───────────────────────────────────────────────────────────────

const CreditsTab: React.FC = () => {
  const {
    data: credits = [],
    isRequesting,
    error,
    refresh,
  } = useReadTransaction(adminListVolunteerCredits, {});

  const { call: approveCredit } = useWriteTransaction(adminApproveVolunteerCredit, refresh);
  const { call: rejectCredit }  = useWriteTransaction(adminRejectVolunteerCredit, refresh);
  const { call: deleteCredit }  = useWriteTransaction(adminDeleteVolunteerCredit, refresh);

  if (isRequesting) return <CircularProgress />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <Grid container spacing={2}>
      {(credits as VolunteerCredit[]).length === 0 && (
        <Grid item xs={12}>
          <Typography variant='body2' color='textSecondary'>No volunteer credits yet.</Typography>
        </Grid>
      )}
      {(credits as VolunteerCredit[]).map((credit: VolunteerCredit) => (
        <Grid item xs={12} key={credit.id}>
          <Card variant='outlined'>
            <CardContent>
              <Grid container alignItems='center' spacing={1}>
                <Grid item xs={12} sm={5}>
                  <Typography variant='body1'>{credit.description}</Typography>
                  <Typography variant='caption' color='textSecondary'>
                    {credit.memberName} — {new Date(credit.createdAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric'
                    })}
                    {credit.taskTitle && ` — Task: ${credit.taskTitle}`}
                  </Typography>
                </Grid>
                <Grid item xs={4} sm={2}>
                  <Typography variant='body2'>
                    {credit.creditValue} {credit.creditValue === 1 ? 'credit' : 'credits'}
                  </Typography>
                </Grid>
                <Grid item xs={4} sm={2}>
                  <Chip
                    size='small'
                    color={statusColor(credit.status)}
                    label={statusLabel(credit.status)}
                  />
                  {credit.discountApplied && (
                    <Chip size='small' label='Discount' style={{ marginLeft: 4 }} />
                  )}
                </Grid>
                <Grid item xs={4} sm={3} style={{ textAlign: 'right' }}>
                  {credit.status === 'pending' && (
                    <>
                      <Tooltip title='Approve'>
                        <IconButton size='small' onClick={() => approveCredit({ id: credit.id })}>
                          <CheckIcon fontSize='small' />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title='Reject'>
                        <IconButton size='small' onClick={() => rejectCredit({ id: credit.id })}>
                          <CloseIcon fontSize='small' />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                  <Tooltip title='Delete'>
                    <IconButton size='small' onClick={() => deleteCredit({ id: credit.id })}>
                      <DeleteIcon fontSize='small' />
                    </IconButton>
                  </Tooltip>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

// ── Create Task Modal ─────────────────────────────────────────────────────────

interface CreateTaskModalProps {
  onClose: () => void;
  onSave: (task: { title: string; description: string; creditValue: string }) => void;
  loading: boolean;
  error: string;
  maxCredit: number;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ onClose, onSave, loading, error, maxCredit }) => {
  const [title, setTitle]             = React.useState('');
  const [description, setDescription] = React.useState('');
  const [creditValue, setCreditValue] = React.useState('1');

  const handleSave = () => {
    if (!title || !description || !creditValue) return;
    onSave({ title, description, creditValue });
  };

  return (
    <FormModal
      id='create-volunteer-task'
      title='Create Bounty Task'
      isOpen={true}
      closeHandler={onClose}
      onSubmit={handleSave}
      loading={loading}
      error={error}
    >
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            label='Title'
            value={title}
            onChange={e => setTitle(e.target.value)}
            fullWidth
            required
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label='Description'
            value={description}
            onChange={e => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={3}
            required
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label={`Credit Value (max ${maxCredit})`}
            value={creditValue}
            onChange={e => setCreditValue(e.target.value)}
            type='number'
            inputProps={{ min: 0.5, max: maxCredit, step: 0.5 }}
            fullWidth
            required
          />
        </Grid>
      </Grid>
    </FormModal>
  );
};

// ── Reason Modal ──────────────────────────────────────────────────────────────

interface ReasonModalProps {
  title: string;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  loading: boolean;
  error: string;
}

const ReasonModal: React.FC<ReasonModalProps> = ({ title, onClose, onSubmit, loading, error }) => {
  const [reason, setReason] = React.useState('');

  return (
    <FormModal
      id='volunteer-reason'
      title={title}
      isOpen={true}
      closeHandler={onClose}
      onSubmit={() => reason && onSubmit(reason)}
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
      />
    </FormModal>
  );
};

// ── Tasks Tab ─────────────────────────────────────────────────────────────────

const TasksTab: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [releaseTarget, setReleaseTarget]     = React.useState<string | null>(null);
  const [rejectTarget, setRejectTarget]       = React.useState<string | null>(null);

  const {
    data: tasks = [],
    isRequesting,
    error,
    refresh,
  } = useReadTransaction(adminListVolunteerTasks, {});

  const { call: createTask, isRequesting: creating, error: createError } =
    useWriteTransaction(adminCreateVolunteerTask, () => { setShowCreateModal(false); refresh(); });

  const { call: completeTask } = useWriteTransaction(adminCompleteVolunteerTask, refresh);
  const { call: cancelTask }   = useWriteTransaction(adminCancelVolunteerTask, refresh);
  const { call: deleteTask }   = useWriteTransaction(adminDeleteVolunteerTask, refresh);

  const { call: releaseTask, isRequesting: releasing, error: releaseError } =
    useWriteTransaction(adminReleaseVolunteerTask, () => { setReleaseTarget(null); refresh(); });

  const { call: rejectTask, isRequesting: rejecting, error: rejectError } =
    useWriteTransaction(adminRejectPendingVolunteerTask, () => { setRejectTarget(null); refresh(); });

  if (isRequesting) return <CircularProgress />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Button
            variant='contained'
            color='primary'
            startIcon={<AddIcon />}
            onClick={() => setShowCreateModal(true)}
          >
            Create Task
          </Button>
        </Grid>

        {(tasks as VolunteerTask[]).length === 0 && (
          <Grid item xs={12}>
            <Typography variant='body2' color='textSecondary'>No bounty tasks yet.</Typography>
          </Grid>
        )}

        {(tasks as VolunteerTask[]).map((task: VolunteerTask) => (
          <Grid item xs={12} key={task.id}>
            <Card variant='outlined'>
              <CardContent>
                <Grid container alignItems='center' spacing={1}>
                  <Grid item xs={12} sm={5}>
                    <Typography variant='body1'>{task.title}</Typography>
                    <Typography variant='caption' color='textSecondary'>
                      {task.description}
                    </Typography>
                    {task.claimedByName && (
                      <Typography variant='caption' color='textSecondary' display='block'>
                        Claimed by: {task.claimedByName}
                      </Typography>
                    )}
                    {task.rejectionReason && (
                      <Typography variant='caption' color='error' display='block'>
                        Reason: {task.rejectionReason}
                      </Typography>
                    )}
                  </Grid>
                  <Grid item xs={4} sm={2}>
                    <Chip
                      size='small'
                      color='primary'
                      label={`${task.creditValue} ${task.creditValue === 1 ? 'credit' : 'credits'}`}
                    />
                  </Grid>
                  <Grid item xs={4} sm={2}>
                    <Chip
                      size='small'
                      color={statusColor(task.status)}
                      label={statusLabel(task.status)}
                    />
                  </Grid>
                  <Grid item xs={4} sm={3} style={{ textAlign: 'right' }}>
                    {task.status === 'pending' && (
                      <>
                        <Tooltip title='Verify Complete'>
                          <IconButton size='small' onClick={() => completeTask({ id: task.id })}>
                            <CheckIcon fontSize='small' />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title='Reject'>
                          <IconButton size='small' onClick={() => setRejectTarget(task.id)}>
                            <CloseIcon fontSize='small' />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                    {task.status === 'claimed' && (
                      <Tooltip title='Release Task'>
                        <IconButton size='small' onClick={() => setReleaseTarget(task.id)}>
                          <CloseIcon fontSize='small' />
                        </IconButton>
                      </Tooltip>
                    )}
                    {task.status === 'available' && (
                      <Tooltip title='Cancel Task'>
                        <IconButton size='small' onClick={() => cancelTask({ id: task.id })}>
                          <CloseIcon fontSize='small' />
                        </IconButton>
                      </Tooltip>
                    )}
                    {['completed', 'cancelled'].includes(task.status) && (
                      <Tooltip title='Delete'>
                        <IconButton size='small' onClick={() => deleteTask({ id: task.id })}>
                          <DeleteIcon fontSize='small' />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {showCreateModal && (
        <CreateTaskModal
          onClose={() => setShowCreateModal(false)}
          onSave={({ title, description, creditValue }) =>
            createTask({ body: { title, description, creditValue: parseFloat(creditValue) } })
          }
          loading={creating}
          error={createError}
          maxCredit={2}
        />
      )}

      {releaseTarget && (
        <ReasonModal
          title='Release Task'
          onClose={() => setReleaseTarget(null)}
          onSubmit={reason => releaseTask({ id: releaseTarget, reason })}
          loading={releasing}
          error={releaseError}
        />
      )}

      {rejectTarget && (
        <ReasonModal
          title='Reject Task Completion'
          onClose={() => setRejectTarget(null)}
          onSubmit={reason => rejectTask({ id: rejectTarget, reason })}
          loading={rejecting}
          error={rejectError}
        />
      )}
    </>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const AdminVolunteerPage: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<TabKey>('credits');

  return (
    <Grid container spacing={3} justify='center'>
      <Grid item md={10} xs={12}>
        <Typography variant='h5' gutterBottom>
          Volunteer
        </Typography>
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
