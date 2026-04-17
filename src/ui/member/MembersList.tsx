import * as React from "react";
import useReactRouter from "use-react-router";
import { Link } from 'react-router-dom';
import Grid from "@material-ui/core/Grid";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Checkbox from "@material-ui/core/Checkbox";
import Tooltip from "@material-ui/core/Tooltip";
import IconButton from "@material-ui/core/IconButton";
import InfoOutlined from "@material-ui/icons/InfoOutlined";
import Typography from "@material-ui/core/Typography";

import { displayMemberExpiration, buildProfileRouting } from "ui/member/utils";
import { SortDirection } from "ui/common/table/constants";
import { Column } from "ui/common/table/Table";
import MemberStatusLabel from "ui/member/MemberStatusLabel";

import { listMembers, getMember, MemberSummary } from "makerspace-ts-api-client";
import CreateMember from "ui/member/CreateMember";
import RenewMember from "ui/member/RenewMember";
import extractTotalItems from "../utils/extractTotalItems";
import useReadTransaction from "ui/hooks/useReadTransaction";
import StatefulTable from "../common/table/StatefulTable";
import { useQueryContext, withQueryContext } from "../common/Filters/QueryContext";
import { useAuthState } from "ui/reducer/hooks";

// Columns shown to admins and resource managers (includes notes tooltip)
const getFields = (showNotes: boolean): Column<MemberSummary>[] => [
  {
    id: "lastname",
    label: "Name",
    cell: (row: MemberSummary) => (
      <>
        <Link to={`/members/${row.id}`}>{row.firstname} {row.lastname}</Link>
        {showNotes && row.notes && (
          <Tooltip title={row.notes} classes={{ tooltip: "preformatted" }}>
            <IconButton aria-label={row.notes}>
              <InfoOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </>
    ),
    defaultSortDirection: SortDirection.Desc,
  },
  {
    id: "expirationTime",
    label: "Expiration",
    cell: displayMemberExpiration,
    defaultSortDirection: SortDirection.Desc
  },
  {
    id: "status",
    label: "Status",
    cell: (row: MemberSummary) => <MemberStatusLabel member={row}/>
  },
];

const rowId = (member: MemberSummary) => member.id;

const MembersList: React.FC = () => {
  const [selectedId, setSelectedId] = React.useState<string>();
  const { history } = useReactRouter();
  const { params, setParam } = useQueryContext({
    currentMembers: true
  });
  const {
    currentUser: { isAdmin, isResourceManager, id: currentUserId }
  } = useAuthState();

  const canViewAll = isAdmin || isResourceManager;
  const updateFilter = React.useCallback(
    () => setParam("currentMembers", !params.currentMembers),
    [params, setParam]
  );

  // Admins and RMs call listMembers (all members).
  // Regular members also call listMembers but the backend scopes it to themselves.
  const { isRequesting, data: members = [], response, refresh, error } = useReadTransaction(
    listMembers,
    { ...params }
  );

  const onRenew = React.useCallback(() => {
    refresh();
  }, [refresh]);

  const onCreate = React.useCallback((id: string) => {
    history.push(buildProfileRouting(id));
  }, [history]);

  const selectedMember = members.find(member => member.id === selectedId);

  return (
    <Grid container spacing={3} justify="center">
      <Grid item md={10} xs={12}>

        {/* Admin-only action bar */}
        {isAdmin && (
          <Grid>
            <CreateMember onCreate={onCreate} />
            <RenewMember member={selectedMember} onRenew={onRenew} />
            <FormControlLabel
              control={<Checkbox color="primary" value="true" checked={!!params.currentMembers} onChange={updateFilter} />}
              label="View only current members"
            />
          </Grid>
        )}

        {/* Resource Manager info bar */}
        {isResourceManager && (
          <Grid>
            <Typography variant="body2" color="textSecondary" style={{ marginBottom: 8 }} data-testid="rm-notice">
              You are viewing members in read-only mode as a Resource Manager.
            </Typography>
          </Grid>
        )}

        <StatefulTable
          id="members-table"
          title="Members"
          loading={isRequesting}
          data={Object.values(members)}
          error={error}
          totalItems={extractTotalItems(response)}
          selectedIds={selectedId}
          setSelectedIds={canViewAll ? setSelectedId : undefined}
          columns={getFields(canViewAll)}
          rowId={rowId}
          renderSearch={canViewAll}
        />
      </Grid>
    </Grid>
  );
};

export default withQueryContext(MembersList);
