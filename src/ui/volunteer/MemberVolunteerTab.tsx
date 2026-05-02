import * as React from 'react';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Chip from '@material-ui/core/Chip';
import Button from '@material-ui/core/Button';
import Divider from '@material-ui/core/Divider';
import CircularProgress from '@material-ui/core/CircularProgress';
import { Member } from 'makerspace-ts-api-client';

import useReadTransaction from 'ui/hooks/useReadTransaction';
import useWriteTransaction from 'ui/hooks/useWriteTransaction';
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

const statusLabel = (status: string): string => {
  switch (status) {
    case 'pending':   return 'Awaiting Approval';
    case 'approved':  return 'Approved';
    case 'rejected':  return 'Rejected';
    case 'available': return 'Available';
    case 'claimed':   return 'Claimed';
    case 'completed': return 'Completed';
    case 'cancelled': return 'Cancelled';
    default:          return status;
  }
};

const statusColor = (status: string): 'default' | 'primary' | 'secondary' => {
  switch (status) {
    case 'approved':
    case 'completed': return 'primary';
    case 'rejected':
    case 'cancelled': return 'secondary';
    default:          return 'default';
  }
};

const MemberVolunteerTab: React.FC<Props> = ({ member }) => {
  const {
    data: summary,
    isRequesting: summaryLoading,
    refresh: refreshSummary,
  } = useReadTransaction(getVolunteerSummary, {});

  const {
    data: credits = [],
    isRequesting: creditsLoading,
    refresh: refreshCredits,
  } = useReadTransaction(getMemberVolunteerCredits, {});

  const {
    data: tasks = [],
    isRequesting: tasksLoading,
    refresh: refreshTasks,
  } = useReadTransaction(getMemberVolunteerTasks, {});

  const refreshAll = React.useCallback(() => {
    refreshSummary();
    refreshCredits();
    refreshTasks();
  }, [refreshSummary, refreshCredits, refreshTasks]);

  const { call: claimTask, isRequesting: claiming } = useWriteTransaction(
    claimVolunteerTask,
    refreshAll
  );

  const { call: markComplete, isRequesting: completing } = useWriteTransaction(
    completeVolunteerTask,
    refreshAll
  );

  const myClaimedTask = (tasks as VolunteerTask[]).find(
    t => t.claimedById === member.id && ['claimed', 'pending'].includes(t.status)
  );

  const availableTasks = (tasks as VolunteerTask[]).filter(t => t.status === 'available');

  const s = summary as VolunteerSummary & { discount_active?: boolean };

  if (summaryLoading && creditsLoading) {
    return (
      <Grid container justify='center' style={{ padding: 32 }}>
        <CircularProgress />
      </Grid>
    );
  }

  return (
    <Grid container spacing={3} style={{ padding: '16px 0' }}>

      {/* Summary banner */}
      {s && (
        <Grid item xs={12}>
          <Card variant='outlined'>
            <CardContent>
              <Grid container spacing={2} alignItems='center'>
                <Grid item xs={12} sm={s.discount_active ? 4 : 6}>
                  <Typography variant='h4' color='primary'>
                    {s.year_count}
                  </Typography>
                  <Typography variant='body2' color='textSecondary'>
                    Credits this year
                  </Typography>
                </Grid>
                {s.discount_active && (
                  <Grid item xs={12} sm={4}>
                    <Typography variant='h4'>
                      {s.discounts_used} / {s.max_discounts}
                    </Typography>
                    <Typography variant='body2' color='textSecondary'>
                      Discounts applied
                    </Typography>
                  </Grid>
                )}
                {s.pending_count > 0 && (
                  <Grid item xs={12} sm={4}>
                    <Typography variant='h4'>
                      {s.pending_count}
                    </Typography>
                    <Typography variant='body2' color='textSecondary'>
                      Pending approval
                    </Typography>
                  </Grid>
                )}
              </Grid>
              {s.discount_active && s.message && (
                <Typography variant='body1' style={{ marginTop: 12 }} color='primary'>
                  {s.message}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* My active task */}
      {myClaimedTask && (
        <Grid item xs={12}>
          <Typography variant='h6' gutterBottom>My Active Task</Typography>
          <Card variant='outlined'>
            <CardContent>
              <Grid container alignItems='center' spacing={2}>
                <Grid item xs={12} sm={8}>
                  <Typography variant='subtitle1'>{myClaimedTask.title}</Typography>
                  <Typography variant='body2' color='textSecondary'>{myClaimedTask.description}</Typography>
                  <Chip
                    size='small'
                    label={statusLabel(myClaimedTask.status)}
                    style={{ marginTop: 8 }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  {myClaimedTask.status === 'claimed' && (
                    <Button
                      variant='contained'
                      color='primary'
                      disabled={completing}
                      onClick={() => markComplete({ id: myClaimedTask.id })}
                    >
                      Mark Complete
                    </Button>
                  )}
                  {myClaimedTask.status === 'pending' && (
                    <Typography variant='body2' color='textSecondary'>
                      Awaiting admin verification
                    </Typography>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Available bounty tasks */}
      {availableTasks.length > 0 && !myClaimedTask && (
        <Grid item xs={12}>
          <Typography variant='h6' gutterBottom>Available Bounty Tasks</Typography>
          <Grid container spacing={2}>
            {availableTasks.map((task: VolunteerTask) => (
              <Grid item xs={12} sm={6} key={task.id}>
                <Card variant='outlined'>
                  <CardContent>
                    <Grid container alignItems='center' spacing={1}>
                      <Grid item xs={12}>
                        <Typography variant='subtitle1'>{task.title}</Typography>
                        <Typography variant='body2' color='textSecondary'>{task.description}</Typography>
                        {task.shopName && (
                          <Typography variant='caption' color='textSecondary'>{task.shopName}</Typography>
                        )}
                      </Grid>
                      <Grid item xs={6}>
                        <Chip
                          size='small'
                          color='primary'
                          label={`${task.creditValue} ${task.creditValue === 1 ? 'credit' : 'credits'}`}
                        />
                      </Grid>
                      <Grid item xs={6} style={{ textAlign: 'right' }}>
                        <Button
                          size='small'
                          variant='outlined'
                          color='primary'
                          disabled={claiming}
                          onClick={() => claimTask({ id: task.id })}
                        >
                          Claim
                        </Button>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>
      )}

      <Grid item xs={12}>
        <Divider />
      </Grid>

      {/* Credit history */}
      <Grid item xs={12}>
        <Typography variant='h6' gutterBottom>Credit History</Typography>
        {creditsLoading && <CircularProgress size={24} />}
        {!creditsLoading && (credits as VolunteerCredit[]).length === 0 && (
          <Typography variant='body2' color='textSecondary'>
            No credits yet. Claim a bounty task or participate in a volunteer event to get started.
          </Typography>
        )}
        {(credits as VolunteerCredit[]).map((credit: VolunteerCredit) => (
          <Card key={credit.id} variant='outlined' style={{ marginBottom: 8 }}>
            <CardContent style={{ paddingBottom: 8 }}>
              <Grid container alignItems='center' spacing={1}>
                <Grid item xs={12} sm={8}>
                  <Typography variant='body1'>{credit.description}</Typography>
                  <Typography variant='caption' color='textSecondary'>
                    {new Date(credit.createdAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric'
                    })}
                    {credit.issuedByName && ` — Issued by ${credit.issuedByName}`}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={2}>
                  <Typography variant='body2'>
                    {credit.creditValue} {credit.creditValue === 1 ? 'credit' : 'credits'}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={2} style={{ textAlign: 'right' }}>
                  <Chip
                    size='small'
                    color={statusColor(credit.status)}
                    label={statusLabel(credit.status)}
                  />
                  {credit.discountApplied && s?.discount_active && (
                    <Chip
                      size='small'
                      label='Discount Applied'
                      style={{ marginLeft: 4, backgroundColor: '#e8f5e9', color: '#2e7d32' }}
                    />
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        ))}
      </Grid>

    </Grid>
  );
};

export default MemberVolunteerTab;
