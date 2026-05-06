import * as React from 'react';
import Tooltip from '@material-ui/core/Tooltip';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import ErrorIcon from '@material-ui/icons/Error';
import InfoOutlined from '@material-ui/icons/InfoOutlined';

// Mailtrap webhook event values (event field, not status)
const GOOD_STATUSES = ['delivery', 'open', 'click'];

const STATUS_LABELS: Record<string, string> = {
  'delivery':    'Email delivered successfully',
  'open':        'Email opened by recipient',
  'click':       'Email link clicked by recipient',
  'bounce':      'Email bounced — address may be invalid',
  'soft bounce': 'Email soft bounced — temporary delivery failure',
  'spam':        'Email marked as spam by recipient',
  'unsubscribe': 'Recipient has unsubscribed from emails',
  'reject':      'Email rejected by mail server',
  'suspension':  'Email suspended — domain verification issue',
};

export interface MailtrapData {
  status: string;
  timestamp: string;
  email: string;
}

export interface SlackData {
  slack_id: string;
  name: string;
}

export const EmailStatusIcon: React.FC<{ mailtrap?: MailtrapData }> = ({ mailtrap }) => {
  if (!mailtrap) {
    return (
      <Tooltip title='No email delivery data on record'>
        <InfoOutlined fontSize='small' style={{ color: '#9e9e9e', verticalAlign: 'middle' }} />
      </Tooltip>
    );
  }

  const { status, timestamp, email } = mailtrap;
  const isGood = GOOD_STATUSES.includes(status);
  const label = STATUS_LABELS[status] || `Email status: ${status}`;
  const formattedTime = timestamp ? new Date(timestamp).toLocaleString() : '';
  const tooltipText = `${label}${formattedTime ? ` (${formattedTime})` : ''}${email ? ` — ${email}` : ''}`;

  return (
    <Tooltip title={tooltipText}>
      {isGood
        ? <CheckCircleIcon fontSize='small' style={{ color: '#4caf50', verticalAlign: 'middle' }} />
        : <ErrorIcon fontSize='small' style={{ color: '#f44336', verticalAlign: 'middle' }} />
      }
    </Tooltip>
  );
};

export const SlackStatusIcon: React.FC<{ slack?: SlackData }> = ({ slack }) => {
  if (!slack) {
    return (
      <Tooltip title='No Slack account linked to this member'>
        <InfoOutlined fontSize='small' style={{ color: '#9e9e9e', verticalAlign: 'middle' }} />
      </Tooltip>
    );
  }

  return (
    <Tooltip title={`Slack account linked: ${slack.name}`}>
      <CheckCircleIcon fontSize='small' style={{ color: '#4caf50', verticalAlign: 'middle' }} />
    </Tooltip>
  );
};
