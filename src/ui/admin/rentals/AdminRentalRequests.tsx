import * as React from "react";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import { Link } from "react-router-dom";
import { Rental, adminListRentals } from "makerspace-ts-api-client";

import StatefulTable from "ui/common/table/StatefulTable";
import { SortDirection } from "ui/common/table/constants";
import { Column } from "ui/common/table/Table";
import { Status } from "ui/constants";
import StatusLabel from "ui/common/StatusLabel";
import ErrorMessage from "ui/common/ErrorMessage";
import useReadTransaction from "ui/hooks/useReadTransaction";
import useWriteTransaction from "ui/hooks/useWriteTransaction";
import { approveRental, denyRental } from "api/rentals";
import { withQueryContext, useQueryContext } from "ui/common/Filters/QueryContext";
import extractTotalItems from "ui/utils/extractTotalItems";

const rowId = (rental: Rental) => rental.id;
type ActionTarget = { rental: Rental; action: "approve" | "deny" };

const infoBoxStyle: React.CSSProperties = {
  marginTop: "8px", padding: "8px",
  backgroundColor: "#e3f2fd", borderRadius: "4px",
  border: "1px solid #90caf9"
};

const AdminRentalRequests: React.FC = () => {
  const [actionTarget, setActionTarget] = React.useState<ActionTarget | null>(null);
  const [denyReason,   setDenyReason]   = React.useState("");
  const { params, changePage } = useQueryContext();

  const { isRequesting, data: rentals = [], response, refresh, error } = useReadTransaction(
    adminListRentals, { ...params, status: "pending" }, undefined, "admin-rental-requests"
  );

  const onActionSuccess = React.useCallback(() => {
    setActionTarget(null);
    setDenyReason("");
    refresh();
    changePage(0);
  }, [refresh, changePage]);

  const { call: doApprove, isRequesting: approving, error: approveError } = useWriteTransaction(approveRental, onActionSuccess);
  const { call: doDeny,    isRequesting: denying,   error: denyError }    = useWriteTransaction(denyRental,   onActionSuccess);
  const isActing = approving || denying;

  const columns: Column<Rental>[] = [
    {
      id: "number", label: "Spot",
      cell: (row: Rental) => row.number,
      defaultSortDirection: SortDirection.Asc,
    },
    {
      id: "member", label: "Member",
      cell: (row: Rental) => <Link to={`/members/${row.memberId}`}>{row.memberName}</Link>,
    },
    {
      id: "description", label: "Description",
      cell: (row: Rental) => row.description || "—",
    },
    {
      id: "notes", label: "Member Notes",
      cell: (row: Rental) => (row as any).notes || "—",
    },
    {
      id: "status", label: "Status",
      cell: () => <StatusLabel label="Pending Approval" color={Status.Warn} />,
    },
    {
      id: "actions", label: "Actions",
      cell: (row: Rental) => (
        <div style={{ display: "flex", gap: "8px" }}>
          <Button size="small" variant="contained" color="primary"
            onClick={e => { e.stopPropagation(); setActionTarget({ rental: row, action: "approve" }); }}
          >Approve</Button>
          <Button size="small" variant="outlined" color="secondary"
            onClick={e => { e.stopPropagation(); setActionTarget({ rental: row, action: "deny" }); }}
          >Deny</Button>
        </div>
      ),
    },
  ];

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        {!isRequesting && rentals.length === 0 && (
          <Typography color="textSecondary">No pending rental requests.</Typography>
        )}
        <StatefulTable
          id="admin-rental-requests-table" title="Pending Rental Requests"
          loading={isRequesting} data={Object.values(rentals)} error={error}
          totalItems={extractTotalItems(response)} columns={columns}
          rowId={rowId} renderSearch={false}
        />
      </Grid>

      <Dialog open={!!actionTarget} onClose={() => !isActing && setActionTarget(null)}>
        <DialogTitle>
          {actionTarget?.action === "approve" ? "Approve Rental Request" : "Deny Rental Request"}
        </DialogTitle>
        <DialogContent>
          {actionTarget && (
            <>
              <Typography gutterBottom>Member: <strong>{actionTarget.rental.memberName}</strong></Typography>
              <Typography gutterBottom>Spot: <strong>{actionTarget.rental.number}</strong></Typography>
              {(actionTarget.rental as any).notes && (
                <Typography gutterBottom color="textSecondary">
                  Member notes: {(actionTarget.rental as any).notes}
                </Typography>
              )}
              {actionTarget.action === "approve" && (
                <Typography variant="body2" style={infoBoxStyle}>
                  Approving will activate the rental and generate an invoice for the member.
                </Typography>
              )}
              {actionTarget.action === "deny" && (
                <TextField
                  fullWidth multiline rows={3}
                  label="Reason for denial (optional)"
                  placeholder="This will be included in the notification email to the member."
                  value={denyReason}
                  onChange={e => setDenyReason(e.target.value)}
                  variant="outlined"
                  style={{ marginTop: "16px" }}
                />
              )}
              <ErrorMessage error={approveError || denyError} />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionTarget(null)} disabled={isActing}>Cancel</Button>
          {actionTarget?.action === "approve" && (
            <Button color="primary" variant="contained" disabled={isActing}
              onClick={() => doApprove({ id: actionTarget.rental.id })}
            >{approving ? "Approving..." : "Approve"}</Button>
          )}
          {actionTarget?.action === "deny" && (
            <Button color="secondary" variant="contained" disabled={isActing}
              onClick={() => doDeny({ id: actionTarget.rental.id, body: { reason: denyReason } })}
            >{denying ? "Denying..." : "Deny"}</Button>
          )}
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default withQueryContext(AdminRentalRequests);
