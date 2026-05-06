import * as React from 'react';
import Tooltip from '@material-ui/core/Tooltip';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import ErrorIcon from '@material-ui/icons/Error';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';

// Mailtrap statuses that are considered healthy
const GOOD_STATUSES = ['delivered', 'opened', 'clicked'];

// Mailtrap statuses that are considered problems
const BAD_STATUSES = ['bounced', 'soft_bounced', 'spam', 'unsubscribed', 'rejected'];

const STATUS_LABELS: Record<string, string> = {
  delivered:    'Email delivered successfully',
  opened:       'Email opened by recipient',
  clicked:      'Email link clicked by recipient',
  bounced:      'Email bounced — address may be invalid',
  soft_bounced: 'Email soft bounced — temporary delivery failure',
  spam:         'Email marked as spam by recipient',
  unsubscribed: 'Recipient has unsubscribed from emails',
  rejected:     'Email rejected by mail server',
};

interface MailtrapData {
  status: string;
  timestamp: string;
  email: string;
}

interface SlackData {
  slack_id: string;
  name: string;
}

interface Props {
  mailtrap?: MailtrapData;
  slack?: SlackData;
  /** When true, renders both icons horizontally (for table cells).
   *  When false, renders each on its own labelled row (for detail page). */
  inline?: boolean;
}

const EmailStatusIcon: React.FC<{ mailtrap?: MailtrapData }> = ({ mailtrap }) => {
  if (!mailtrap) {
    return (
      <Tooltip title='No email delivery data on record'>
        <HelpOutlineIcon fontSize='small' style={{ color: '#9e9e9e', verticalAlign: 'middle' }} />
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

const SlackStatusIcon: React.FC<{ slack?: SlackData }> = ({ slack }) => {
  if (!slack) {
    return (
      <Tooltip title='No Slack account linked to this member'>
        <HelpOutlineIcon fontSize='small' style={{ color: '#9e9e9e', verticalAlign: 'middle' }} />
      </Tooltip>
    );
  }

  return (
    <Tooltip title={`Slack account linked: ${slack.name}`}>
      <CheckCircleIcon fontSize='small' style={{ color: '#4caf50', verticalAlign: 'middle' }} />
    </Tooltip>
  );
};

/**
 * Renders email and slack status icons for a member.
 * Use inline=true for table cells, inline=false (default) for detail page rows.
 */
const ContactStatusIcons: React.FC<Props> = ({ mailtrap, slack, inline = false }) => {
  if (inline) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <EmailStatusIcon mailtrap={mailtrap} />
        <SlackStatusIcon slack={slack} />
      </span>
    );
  }

  return (
    <>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <EmailStatusIcon mailtrap={mailtrap} />
        <span style={{ fontSize: '0.875rem' }}>
          {mailtrap ? (GOOD_STATUSES.includes(mailtrap.status) ? 'Delivered' : mailtrap.status.replace('_', ' ')) : 'Unknown'}
        </span>
      </span>
      <br />
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
        <SlackStatusIcon slack={slack} />
        <span style={{ fontSize: '0.875rem' }}>
          {slack ? slack.name : 'Not linked'}
        </span>
      </span>
    </>
  );
};

export default ContactStatusIcons;
export { EmailStatusIcon, SlackStatusIcon };
